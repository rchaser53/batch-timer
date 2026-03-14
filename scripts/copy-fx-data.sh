#!/bin/bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SRC_DIR="$ROOT_DIR/data"
DEFAULT_DST_ROOT="$HOME/Desktop/fx-data-analysis"

usage() {
    echo "Usage: $0 [--dry-run] [destination-root]"
    echo ""
    echo "Copies all directories and files under $SRC_DIR into destination-root/data."
    echo ""
    echo "Examples:"
    echo "  $0"
    echo "  $0 --dry-run"
    echo "  $0 /Users/rchaser53/Desktop/fx-data-analysis"
}

DRY_RUN=false
DST_ROOT="${FX_DATA_ANALYSIS_DIR:-$DEFAULT_DST_ROOT}"

while [[ $# -gt 0 ]]; do
    case "$1" in
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        -h|--help)
            usage
            exit 0
            ;;
        *)
            DST_ROOT="$1"
            shift
            ;;
    esac
done

DST_DIR="$DST_ROOT/data"

if [ ! -d "$SRC_DIR" ]; then
    echo "Source directory not found: $SRC_DIR" >&2
    exit 1
fi

mkdir -p "$DST_DIR"

RSYNC_ARGS=(-a)
if [ "$DRY_RUN" = true ]; then
    RSYNC_ARGS+=(--dry-run --itemize-changes)
fi

echo "Source: $SRC_DIR"
echo "Destination: $DST_DIR"

rsync "${RSYNC_ARGS[@]}" "$SRC_DIR/" "$DST_DIR/"

if [ "$DRY_RUN" = true ]; then
    echo "Dry run completed. No files were copied."
else
    echo "Copy completed."
fi