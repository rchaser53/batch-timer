#!/bin/bash

# 1時間ごとに「当日一度も実行されていない」ジョブを検知し、必要なら起動する。
# - 対象は plist の EnvironmentVariables に BATCH_TIMER_CATCHUP=1 を設定したもののみ（opt-in）
# - 実行済み判定は StandardOutPath/StandardErrorPath の更新日（mtime）を優先
# - 実行/起動の試行は logs/stamps/catchup.<plist>.stamp に当日スタンプを残し、同日の多重起動を避ける
# - launchd load 済みなら launchctl kickstart を優先し、未load等なら ProgramArguments を直接 spawn
#
# 必須要件（安全のため）:
# - 対象ジョブ（BATCH_TIMER_CATCHUP=1）は StandardOutPath または StandardErrorPath を設定してください。
#   （ログパスが無い場合、外部要因の実行を検知できず意図せず二重実行になりうるため、このスクリプトはスキップします）

set -euo pipefail

WORKSPACE_ROOT="${BATCH_TIMER_WORKSPACE_ROOT:-${PWD}}"

/usr/bin/python3 - "$WORKSPACE_ROOT" <<'PY'
import os
import sys
import glob
import plistlib
import subprocess
import datetime

workspace_root = sys.argv[1]

TODAY = datetime.date.today().isoformat()

logs_dir = os.path.join(workspace_root, "logs")
stamps_dir = os.path.join(logs_dir, "stamps")
os.makedirs(stamps_dir, exist_ok=True)

log_file = os.path.join(logs_dir, "catchup-check.log")

def write_log(message: str) -> None:
    ts = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    line = f"[{ts}] {message}\n"
    try:
        os.makedirs(os.path.dirname(log_file), exist_ok=True)
        with open(log_file, "a", encoding="utf-8") as f:
            f.write(line)
    except Exception:
        pass


def truthy(value) -> bool:
    if value is None:
        return False
    s = str(value).strip().lower()
    return s in ("1", "true", "yes", "y", "on")


def abs_path(p: str) -> str:
    if not p:
        return ""
    return p if os.path.isabs(p) else os.path.join(workspace_root, p)


def file_mtime_date(p: str):
    try:
        ts = os.path.getmtime(p)
        return datetime.date.fromtimestamp(ts).isoformat()
    except Exception:
        return None


def load_plist(plist_path: str):
    with open(plist_path, "rb") as f:
        return plistlib.load(f)


def should_run_after(env: dict) -> bool:
    # 任意: 指定時刻以降にのみ catchup 実行する
    # - BATCH_TIMER_CATCHUP_AFTER_HOUR / _MINUTE
    # - 未指定なら 0:00
    try:
        hour = int(str(env.get("BATCH_TIMER_CATCHUP_AFTER_HOUR", "0")).strip() or "0")
        minute = int(str(env.get("BATCH_TIMER_CATCHUP_AFTER_MINUTE", "0")).strip() or "0")
    except Exception:
        hour, minute = 0, 0

    now = datetime.datetime.now()
    now_total = now.hour * 60 + now.minute
    target_total = hour * 60 + minute
    return now_total >= target_total


def read_stamp(stamp_path: str) -> str:
    try:
        with open(stamp_path, "r", encoding="utf-8") as f:
            return (f.readline() or "").strip()
    except Exception:
        return ""


def write_stamp(stamp_path: str, date_str: str) -> None:
    os.makedirs(os.path.dirname(stamp_path), exist_ok=True)
    with open(stamp_path, "w", encoding="utf-8") as f:
        f.write(date_str + "\n")


def ensure_parent_dir(file_path: str) -> None:
    if not file_path:
        return
    os.makedirs(os.path.dirname(file_path), exist_ok=True)


def run_kickstart(label: str):
    uid = os.getuid()
    args = ["launchctl", "kickstart", "-k", f"gui/{uid}/{label}"]
    return subprocess.run(args, capture_output=True, text=True)


def spawn_direct(data: dict, stdout_path: str, stderr_path: str):
    program_args = data.get("ProgramArguments")
    program = data.get("Program")

    cmd = None
    if isinstance(program_args, list) and program_args and all(isinstance(x, str) for x in program_args):
        cmd = program_args
    elif isinstance(program, str) and program:
        cmd = [program]

    if not cmd:
        raise RuntimeError("ProgramArguments/Program is missing")

    cwd = data.get("WorkingDirectory")
    if isinstance(cwd, str) and cwd:
        cwd = cwd if os.path.isabs(cwd) else os.path.join(workspace_root, cwd)
    else:
        cwd = workspace_root

    env = os.environ.copy()
    envvars = data.get("EnvironmentVariables")
    if isinstance(envvars, dict):
        for k, v in envvars.items():
            if not isinstance(k, str):
                continue
            if v is None:
                continue
            env[k] = str(v)

    stdout_handle = None
    stderr_handle = None
    try:
        if stdout_path:
            ensure_parent_dir(stdout_path)
            stdout_handle = open(stdout_path, "a", encoding="utf-8")
        if stderr_path:
            ensure_parent_dir(stderr_path)
            stderr_handle = open(stderr_path, "a", encoding="utf-8")

        p = subprocess.Popen(
            cmd,
            cwd=cwd,
            env=env,
            stdin=subprocess.DEVNULL,
            stdout=stdout_handle or subprocess.DEVNULL,
            stderr=stderr_handle or subprocess.DEVNULL,
            start_new_session=True,
        )
        return p.pid
    finally:
        try:
            if stdout_handle:
                stdout_handle.close()
        except Exception:
            pass
        try:
            if stderr_handle:
                stderr_handle.close()
        except Exception:
            pass


# main
plists = sorted(glob.glob(os.path.join(workspace_root, "*.plist")))

total_plists = 0
optin_plists = 0
skipped_self = 0
skipped_parse_failed = 0
skipped_before_time = 0
skipped_no_logs = 0
skipped_ran_today = 0
skipped_attempted_today = 0
run_kickstart_ok = 0
run_kickstart_failed = 0
run_spawn_ok = 0
run_spawn_failed = 0

if not plists:
    write_log(f"SUMMARY root={workspace_root} total_plists=0 optin_plists=0 triggered=0")
    sys.exit(0)

for plist_path in plists:
    total_plists += 1
    name = os.path.basename(plist_path)

    # 自己自身のチェックジョブなどは誤爆しやすいので明示的に除外
    if name.startswith("com.user.batch-timer.catchup"):
        skipped_self += 1
        continue

    try:
        data = load_plist(plist_path)
    except Exception as e:
        write_log(f"WARN skip name={name} reason=plist-parse-failed err={e}")
        skipped_parse_failed += 1
        continue

    env = data.get("EnvironmentVariables")
    env = env if isinstance(env, dict) else {}

    if not truthy(env.get("BATCH_TIMER_CATCHUP")):
        continue

    optin_plists += 1

    if not should_run_after(env):
        skipped_before_time += 1
        continue

    label = data.get("Label") if isinstance(data.get("Label"), str) else ""

    stdout_path = abs_path(data.get("StandardOutPath") or "") if isinstance(data.get("StandardOutPath"), str) else ""
    stderr_path = abs_path(data.get("StandardErrorPath") or "") if isinstance(data.get("StandardErrorPath"), str) else ""

    # 外部実行（launchd等）を検知するためにログパスは必須扱い
    if not stdout_path and not stderr_path:
        write_log(f"WARN skip name={name} reason=no-log-paths; set StandardOutPath/StandardErrorPath")
        skipped_no_logs += 1
        continue

    # 直近のログ更新日が今日なら「実行済み」
    out_date = file_mtime_date(stdout_path) if stdout_path else None
    err_date = file_mtime_date(stderr_path) if stderr_path else None
    ran_today = (out_date == TODAY) or (err_date == TODAY)

    stamp_path = os.path.join(stamps_dir, f"catchup.{name}.stamp")
    attempted_today = read_stamp(stamp_path) == TODAY

    if ran_today:
        skipped_ran_today += 1
        continue
    if attempted_today:
        skipped_attempted_today += 1
        continue

    # 起動（同日の多重試行を避けるため、まずスタンプを打つ）
    try:
        write_stamp(stamp_path, TODAY)
    except Exception as e:
        write_log(f"WARN name={name} failed-to-write-stamp err={e}")

    # launchctl kickstart を優先（load 済みなら最も忠実）
    if label:
        try:
            res = run_kickstart(label)
            if res.returncode == 0:
                write_log(f"RUN name={name} mode=kickstart label={label}")
                run_kickstart_ok += 1
                continue
            else:
                write_log(
                    "RUN name={name} mode=kickstart-failed label={label} code={code} stderr={stderr}".format(
                        name=name,
                        label=label,
                        code=res.returncode,
                        stderr=(res.stderr or "").strip().replace("\n", " ")[:500],
                    )
                )
                run_kickstart_failed += 1
        except Exception as e:
            write_log(f"RUN name={name} mode=kickstart-error label={label} err={e}")
            run_kickstart_failed += 1

    # フォールバック: plistの ProgramArguments を直接 spawn
    try:
        pid = spawn_direct(data, stdout_path, stderr_path)
        write_log(f"RUN name={name} mode=spawn pid={pid}")
        run_spawn_ok += 1
    except Exception as e:
        write_log(f"WARN name={name} spawn-failed err={e}")
        run_spawn_failed += 1

triggered = run_kickstart_ok + run_spawn_ok
write_log(
    "SUMMARY root={root} total_plists={total} optin_plists={optin} triggered={trig} "
    "skip_self={skip_self} skip_parse_failed={skip_parse} skip_before_time={skip_time} "
    "skip_no_logs={skip_logs} skip_ran_today={skip_ran} skip_attempted_today={skip_attempt} "
    "kickstart_ok={k_ok} kickstart_failed={k_ng} spawn_ok={s_ok} spawn_failed={s_ng}".format(
        root=workspace_root,
        total=total_plists,
        optin=optin_plists,
        trig=triggered,
        skip_self=skipped_self,
        skip_parse=skipped_parse_failed,
        skip_time=skipped_before_time,
        skip_logs=skipped_no_logs,
        skip_ran=skipped_ran_today,
        skip_attempt=skipped_attempted_today,
        k_ok=run_kickstart_ok,
        k_ng=run_kickstart_failed,
        s_ok=run_spawn_ok,
        s_ng=run_spawn_failed,
    )
)

PY
