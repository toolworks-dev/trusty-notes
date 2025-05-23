# Vim Mode for TrustyNotes

TrustyNotes includes a Vim-like editing mode that brings the power and efficiency of Vim keyboard shortcuts to the editor. This feature allows you to navigate and edit text using familiar Vim commands.

## Enabling Vim Mode

Vim mode can be toggled on/off using the "Vim Mode" switch in the editor toolbar. When enabled, you'll see a status indicator in the bottom right corner showing your current mode.

## Modes

Like Vim, this implementation has several editing modes:

- **Normal Mode**: Default navigation and command mode (shown as "NORMAL")
- **Insert Mode**: For typing and editing text (shown as "INSERT")
- **Visual Mode**: For selecting text (shown as "VISUAL")
- **Command Mode**: For executing commands (shown as "COMMAND")

## Status Line

When Vim mode is enabled, a status line appears at the bottom of the editor showing:

- Current mode (NORMAL, INSERT, VISUAL, COMMAND)
- Cursor position (line and column numbers)
- Line Number

## Command Reference

### Mode Switching

| Command | Description |
|---------|-------------|
| `Ctrl +` | Enter/Exit Vim Mode
| `Escape` | Switch to Normal mode from any other mode |
| `i` | Enter Insert mode at cursor position |
| `a` | Enter Insert mode after cursor position |
| `o` | Open new line below cursor and enter Insert mode |
| `O` | Open new line above cursor and enter Insert mode |
| `v` | Enter Visual mode for character-wise selection |
| `V` | Enter Visual line mode (select entire lines) |
| `:` | Enter Command mode |

### Navigation (Normal Mode) (Arrow Keys also work)

| Command | Description |
|---------|-------------|
| `h` | Move cursor left |
| `j` | Move cursor down |
| `k` | Move cursor up |
| `l` | Move cursor right |
| `w` | Move to start of next word |
| `b` | Move to start of previous word |
| `e` | Move to end of current word |
| `0` | Move to start of line |
| `$` | Move to end of line |
| `gg` | Move to beginning of document |
| `G` | Move to end of document |
| `{number}G` | Go to specific line number |

### Editing (Normal Mode)

| Command | Description |
|---------|-------------|
| `x` | Delete character under cursor |
| `dd` | Delete current line |
| `dw` | Delete word |
| `d$` | Delete to end of line |
| `cc` | Change entire line (delete and enter Insert mode) |
| `cw` | Change word (delete word and enter Insert mode) |
| `yy` | Yank (copy) current line |
| `p` | Paste after cursor |
| `P` | Paste before cursor |
| `>>` | Indent line |
| `<<` | Unindent line |
| `u` | Undo |
| `Ctrl+r` | Redo |

### Search and Replace

| Command | Description |
|---------|-------------|
| `/pattern` | Search forward for pattern |
| `n` | Go to next search match |
| `N` | Go to previous search match |
| `:%s/pattern/replacement/g` | Global search and replace |
| `:%s/pattern/replacement/gi` | Global search and replace (case insensitive) |

## Examples

### Basic Editing

1. Press `i` to enter Insert mode and type text normally
2. Press `Escape` to return to Normal mode
3. Use `h`, `j`, `k`, `l` to navigate
4. Press `dd` to delete a line
5. Press `u` to undo changes

### Search and Replace

1. Press `:` to enter Command mode
2. Type `%s/old text/new text/g` and press Enter
3. All instances of "old text" will be replaced with "new text"

### Efficient Navigation

1. Press `gg` to go to the top of the document
2. Press `G` to go to the bottom of the document
3. Press `0` to go to the start of the current line
4. Press `$` to go to the end of the current line

## Tips

- The status line at the bottom shows your current mode and cursor position
- The status indicator in the bottom right corner always shows your current mode
- You can combine commands with numbers (e.g., `5j` to move down 5 lines)
- Press `Escape` anytime you're unsure, to return to Normal mode
- When in Normal mode, all regular key presses are intercepted for commands

## Keyboard Shortcuts Summary

```
Navigation: h j k l w b e 0 $ gg G
Insertion: i a o O
Deletion: x dd dw d$
Change: cc cw
Yank/Paste: yy p P
Undo/Redo: u Ctrl+r
Search: /pattern n N
Search/Replace: :%s/pattern/replacement/g
``` 