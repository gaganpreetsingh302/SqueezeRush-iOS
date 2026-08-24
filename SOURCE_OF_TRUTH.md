# Squeeze Rush Monetization Release Source of Truth

For the Squeeze Rush monetization release, the protected release baseline is the active native Xcode project in this directory:

`D:\Games\Squeeze rush\SqueezeRush\SqueezeRushIOS-Advanced-2.0.0`

The game source used by that Xcode project is its embedded web directory:

`D:\Games\Squeeze rush\SqueezeRush\SqueezeRushIOS-Advanced-2.0.0\SqueezeRushIOS\Web`

Changes for this release must be authored and tested against that embedded `Web` directory unless a later stage explicitly changes this decision.

The sibling source directory below contains a different, newer `game.js` and is not part of this protected release baseline:

`D:\Games\Squeeze rush\SqueezeRush\SqueezeRush`

Do not copy, merge, synchronize, or overwrite files between the sibling directory and the active Xcode project's embedded `Web` directory automatically. Any future comparison or reconciliation must be deliberate, reviewed, and separately backed up.

Pre-Stage-1 backup:

`D:\Games\Squeeze rush\SqueezeRush\Backups\SqueezeRushIOS-Advanced-2.0.0-pre-stage1-20260803-215030.zip`
