import { Extension } from '@tiptap/core';
import { Plugin, PluginKey, TextSelection } from 'prosemirror-state';

export interface VimOptions {
  enabled: boolean;
  onSave?: () => void;
  onQuit?: () => void;
  getFilename?: () => string;
}

type VimCommandState = {
  count: string;
  operator: string;
  motion: string;
  motionArgs?: string;
};

type VimYankRegister = {
  text: string;
  linewise: boolean;
};

declare global {
  interface Window {
    vimMode: {
      enabled: boolean;
      mode: 'normal' | 'insert' | 'visual' | 'command';
      statusElement?: HTMLElement;
      statusLine?: HTMLElement;
      commandInput?: HTMLInputElement;
      commandBuffer: string;
      yankRegister: VimYankRegister;
      commandState: VimCommandState;
      lastCommand?: {
        keys: string[];
        count: number;
      };
      searchState: {
        query: string;
        active: boolean;
        direction: 'forward' | 'backward';
        matches: number[];
        currentMatch: number;
      };
      cursorPosition: {
        line: number;
        column: number;
        totalLines: number;
      };
      options: VimOptions;
      editor?: {
        state: any;
        view: {
          dispatch: (tr: any) => void;
        };
      };
    };
  }
}

export const VimExtension = Extension.create<VimOptions>({
  name: 'vim',

  addOptions() {
    return {
      enabled: true,
      onSave: undefined,
      onQuit: undefined,
      getFilename: undefined,
    };
  },

      addProseMirrorPlugins() {
        const extension = this;
        
        if (typeof window !== 'undefined') {
          const savedVimModeEnabled = loadVimModeState();
          const isEnabled = savedVimModeEnabled !== null ? savedVimModeEnabled : extension.options.enabled;
          
          window.vimMode = {
            enabled: isEnabled,
            mode: 'insert',
            commandBuffer: '',
            yankRegister: { text: '', linewise: false },
            commandState: { count: '', operator: '', motion: '' },
            searchState: {
              query: '',
              active: false,
              direction: 'forward',
              matches: [],
              currentMatch: -1
            },
            cursorPosition: {
              line: 1,
              column: 1,
              totalLines: 1
            },
            options: extension.options,
          };
          
          console.log(`Initialized Vim mode. Enabled: ${isEnabled} (Loaded from storage: ${savedVimModeEnabled !== null})`);
        }

    return [
      new Plugin({
        key: new PluginKey('vim'),
        
        view(view) {
          if (window.vimMode) {
            window.vimMode.editor = {
              state: view.state,
              view: view
            };
            console.log('Stored editor reference in vimMode');
          }
          
          const statusElement = document.createElement('div');
          statusElement.className = 'vim-mode-status';
          statusElement.textContent = 'INSERT';
          statusElement.style.position = 'fixed';
          statusElement.style.bottom = '25px';
          statusElement.style.right = '10px';
          statusElement.style.padding = '4px 8px';
          statusElement.style.backgroundColor = 'rgba(0, 0, 0, 0.85)';
          statusElement.style.color = 'white';
          statusElement.style.borderRadius = '4px';
          statusElement.style.fontFamily = 'monospace';
          statusElement.style.fontSize = '11px';
          statusElement.style.zIndex = '9999';
          statusElement.style.display = window.vimMode?.enabled ? 'block' : 'none';
          statusElement.style.cursor = 'pointer';
          statusElement.style.border = '1px solid rgba(255, 255, 255, 0.3)';
          statusElement.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.3)';
          statusElement.style.transition = 'all 0.2s ease';
          statusElement.title = 'Click for Vim cheat sheet';
          
          const cheatSheet = document.createElement('div');
          cheatSheet.className = 'vim-cheat-sheet';
          cheatSheet.style.position = 'fixed';
          cheatSheet.style.top = '50%';
          cheatSheet.style.left = '50%';
          cheatSheet.style.transform = 'translate(-50%, -50%)';
          cheatSheet.style.backgroundColor = 'rgba(0, 0, 0, 0.95)';
          cheatSheet.style.color = 'white';
          cheatSheet.style.padding = '20px';
          cheatSheet.style.borderRadius = '8px';
          cheatSheet.style.fontFamily = 'monospace';
          cheatSheet.style.fontSize = '12px';
          cheatSheet.style.zIndex = '10000';
          cheatSheet.style.display = 'none';
          cheatSheet.style.maxWidth = '500px';
          cheatSheet.style.maxHeight = '80vh';
          cheatSheet.style.overflowY = 'auto';
          cheatSheet.style.border = '2px solid #4A90E2';
          cheatSheet.style.boxShadow = '0 10px 30px rgba(0, 0, 0, 0.5)';
          cheatSheet.style.lineHeight = '1.4';
          
          cheatSheet.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; border-bottom: 1px solid #444; padding-bottom: 10px;">
              <h3 style="margin: 0; color: #4A90E2; font-size: 16px;">🎯 Vim Mode Cheat Sheet</h3>
              <button class="close-cheat-sheet" style="background: none; border: none; color: #ccc; font-size: 18px; cursor: pointer; padding: 0; width: 24px; height: 24px;">×</button>
            </div>
            
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
              <div>
                <h4 style="color: #FF6B6B; margin: 0 0 8px 0; font-size: 13px;">🔄 MODES</h4>
                <div style="font-size: 11px; line-height: 1.3;">
                  <div><kbd style="background: #333; padding: 1px 4px; border-radius: 2px;">Esc</kbd> → Normal mode</div>
                  <div><kbd style="background: #333; padding: 1px 4px; border-radius: 2px;">i</kbd> → Insert mode</div>
                  <div><kbd style="background: #333; padding: 1px 4px; border-radius: 2px;">a</kbd> → Insert after cursor</div>
                  <div><kbd style="background: #333; padding: 1px 4px; border-radius: 2px;">o/O</kbd> → New line below/above</div>
                  <div><kbd style="background: #333; padding: 1px 4px; border-radius: 2px;">v/V</kbd> → Visual/Line select</div>
                  <div><kbd style="background: #333; padding: 1px 4px; border-radius: 2px;">:</kbd> → Command mode</div>
                </div>
                
                <h4 style="color: #4ECDC4; margin: 12px 0 8px 0; font-size: 13px;">➡️ NAVIGATION</h4>
                <div style="font-size: 11px; line-height: 1.3;">
                  <div><kbd style="background: #333; padding: 1px 4px; border-radius: 2px;">h j k l</kbd> → Left, Down, Up, Right</div>
                  <div><kbd style="background: #333; padding: 1px 4px; border-radius: 2px;">w/b/e</kbd> → Word forward/back/end</div>
                  <div><kbd style="background: #333; padding: 1px 4px; border-radius: 2px;">0/$</kbd> → Start/End of line</div>
                  <div><kbd style="background: #333; padding: 1px 4px; border-radius: 2px;">gg/G</kbd> → Top/Bottom of document</div>
                </div>
                
                <h4 style="color: #95E1D3; margin: 12px 0 8px 0; font-size: 13px;">🔍 SEARCH</h4>
                <div style="font-size: 11px; line-height: 1.3;">
                  <div><kbd style="background: #333; padding: 1px 4px; border-radius: 2px;">/text</kbd> → Search forward</div>
                  <div><kbd style="background: #333; padding: 1px 4px; border-radius: 2px;">n/N</kbd> → Next/Previous match</div>
                </div>
              </div>
              
              <div>
                <h4 style="color: #FFD93D; margin: 0 0 8px 0; font-size: 13px;">✏️ EDITING</h4>
                <div style="font-size: 11px; line-height: 1.3;">
                  <div><kbd style="background: #333; padding: 1px 4px; border-radius: 2px;">x</kbd> → Delete character</div>
                  <div><kbd style="background: #333; padding: 1px 4px; border-radius: 2px;">dd</kbd> → Delete line</div>
                  <div><kbd style="background: #333; padding: 1px 4px; border-radius: 2px;">dw/d$</kbd> → Delete word/to end</div>
                  <div><kbd style="background: #333; padding: 1px 4px; border-radius: 2px;">cc/cw</kbd> → Change line/word</div>
                  <div><kbd style="background: #333; padding: 1px 4px; border-radius: 2px;">yy</kbd> → Copy line</div>
                  <div><kbd style="background: #333; padding: 1px 4px; border-radius: 2px;">p/P</kbd> → Paste after/before</div>
                  <div><kbd style="background: #333; padding: 1px 4px; border-radius: 2px;">u</kbd> → Undo</div>
                  <div><kbd style="background: #333; padding: 1px 4px; border-radius: 2px;">Ctrl+r</kbd> → Redo</div>
                </div>
                
                <h4 style="color: #A8E6CF; margin: 12px 0 8px 0; font-size: 13px;">💾 COMMANDS</h4>
                <div style="font-size: 11px; line-height: 1.3;">
                  <div><kbd style="background: #333; padding: 1px 4px; border-radius: 2px;">:w</kbd> → Save note</div>
                  <div><kbd style="background: #333; padding: 1px 4px; border-radius: 2px;">:wq</kbd> → Save and exit vim mode</div>
                </div>
                
                <div style="margin-top: 15px; padding: 8px; background: rgba(74, 144, 226, 0.2); border-radius: 4px; border-left: 3px solid #4A90E2;">
                  <div style="font-size: 10px; color: #ccc;">💡 <strong>Quick Tips:</strong></div>
                  <div style="font-size: 10px; color: #ccc;">Press <kbd style="background: #333; padding: 1px 3px; border-radius: 2px;">Ctrl+;</kbd> to toggle vim mode</div>
                  <div style="font-size: 10px; color: #ccc;">Press <kbd style="background: #333; padding: 1px 3px; border-radius: 2px;">Ctrl+'</kbd> to toggle this cheat sheet</div>
                </div>
              </div>
            </div>
          `;
          
          statusElement.addEventListener('click', (e) => {
            e.stopPropagation();
            cheatSheet.style.display = cheatSheet.style.display === 'none' ? 'block' : 'none';
          });
          
          statusElement.addEventListener('mouseenter', () => {
            statusElement.style.backgroundColor = 'rgba(74, 144, 226, 0.8)';
            statusElement.style.transform = 'scale(1.05)';
          });
          
          statusElement.addEventListener('mouseleave', () => {
            statusElement.style.backgroundColor = 'rgba(0, 0, 0, 0.85)';
            statusElement.style.transform = 'scale(1)';
          });
          
          const closeButton = cheatSheet.querySelector('.close-cheat-sheet');
          closeButton?.addEventListener('click', () => {
            cheatSheet.style.display = 'none';
          });
          
          document.addEventListener('click', (e) => {
            if (!cheatSheet.contains(e.target as Node) && !statusElement.contains(e.target as Node)) {
              cheatSheet.style.display = 'none';
            }
          });
          
          document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && cheatSheet.style.display === 'block') {
              cheatSheet.style.display = 'none';
            }
          });
          
          document.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.key === "'") {
              e.preventDefault();
              cheatSheet.style.display = cheatSheet.style.display === 'none' ? 'block' : 'none';
            }
          });
          
          document.body.appendChild(statusElement);
          document.body.appendChild(cheatSheet);
          
          const statusLine = document.createElement('div');
          statusLine.className = 'vim-status-line';
          statusLine.style.position = 'fixed';
          statusLine.style.bottom = '0';
          statusLine.style.left = '0';
          statusLine.style.right = '0';
          statusLine.style.padding = '2px 10px';
          statusLine.style.backgroundColor = 'rgba(20, 20, 20, 0.85)';
          statusLine.style.color = 'white';
          statusLine.style.fontFamily = 'monospace';
          statusLine.style.fontSize = '12px';
          statusLine.style.display = window.vimMode?.enabled ? 'flex' : 'none';
          statusLine.style.justifyContent = 'space-between';
          statusLine.style.borderTop = '1px solid rgba(255, 255, 255, 0.2)';
          statusLine.style.height = '18px';
          statusLine.style.zIndex = '9998';
          
          const leftSide = document.createElement('div');
          leftSide.innerHTML = '<b>INSERT</b>';
          if (window.vimMode?.options.getFilename) {
            const filename = window.vimMode.options.getFilename();
            if (filename) {
              leftSide.innerHTML += ` | ${filename}`;
            }
          }
          
          const rightSide = document.createElement('div');
          rightSide.textContent = 'Line: 1, Col: 1';
          
          statusLine.appendChild(leftSide);
          statusLine.appendChild(rightSide);
          document.body.appendChild(statusLine);
          
          const commandInput = document.createElement('input');
          commandInput.className = 'vim-command-input';
          commandInput.style.position = 'fixed';
          commandInput.style.bottom = '50px';
          commandInput.style.left = '50%';
          commandInput.style.transform = 'translateX(-50%)';
          commandInput.style.width = '80%';
          commandInput.style.maxWidth = '500px';
          commandInput.style.padding = '3px 8px';
          commandInput.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
          commandInput.style.color = 'white';
          commandInput.style.border = '1px solid rgba(255, 255, 255, 0.3)';
          commandInput.style.borderRadius = '3px';
          commandInput.style.fontFamily = 'monospace';
          commandInput.style.fontSize = '13px';
          commandInput.style.zIndex = '9999';
          commandInput.style.display = 'none';
          
          commandInput.addEventListener('keydown', (e) => {
            console.log(`Command input keydown: ${e.key}`);
                if (e.key === 'Enter') {
                e.preventDefault();
              e.stopPropagation();
              
              console.log('Enter key pressed in command input');
              if (window.vimMode) {
                const command = commandInput.value;
                console.log(`Executing command from input: "${command}"`);
                window.vimMode.commandBuffer = command;
                commandInput.style.display = 'none';
                
                setTimeout(() => {
                  view.focus();
                }, 10);
                
                 if (command.startsWith(':')) {
                   const actualCommand = command.substring(1).trim();
                   
                   const searchReplaceMatch = actualCommand.match(/^(%)?s\/(.+?)\/(.*)\/([gi]*)$/);
                   
                   if (searchReplaceMatch) {
                     console.log('Found search and replace command:', actualCommand);
                     
                      const [, _percent, pattern, replacement, matchFlags] = searchReplaceMatch;
                      const flags = matchFlags || 'g';
                      
                      console.log(`Parsed search/replace: pattern="${pattern}", replacement="${replacement}", flags="${flags}"`);
                     
                     if (window.vimMode.editor && window.vimMode.editor.state) {
                       const state = window.vimMode.editor.state;
                       const view = window.vimMode.editor.view;
                       let replacements = 0;
                       
                       const tr = state.tr;
                       
                       console.log('Document content:', state.doc.textContent);
                       
                       try {
                         const docContent = state.doc.textContent;
                         const regex = new RegExp(pattern, flags);
                         
                         if (!docContent.match(regex)) {
                           console.log(`Document does not contain pattern: ${pattern}`);
                           if (window.vimMode.statusElement) {
                             window.vimMode.statusElement.textContent = 'No matches found';
                             setTimeout(() => {
                               if (window.vimMode && window.vimMode.mode === 'normal' && window.vimMode.statusElement) {
                                 window.vimMode.statusElement.textContent = 'NORMAL';
                               }
                             }, 2000);
                           }
                           return true;
                         }
                         
                         state.doc.nodesBetween(0, state.doc.content.size, (node: any, pos: number) => {
                           if (node.isText && node.text) {
                             const originalText = node.text;
                             
                             if (originalText.match(regex)) {
                               console.log(`Found text node with match at position ${pos}: "${originalText}"`);
                               
                               const newText = originalText.replace(regex, replacement);
                               
                               if (originalText !== newText) {
                                 tr.replaceWith(
                                   pos, 
                                   pos + originalText.length, 
                                   state.schema.text(newText)
                                 );
                                 
                                 const matches = (originalText.match(regex) || []).length;
                                 replacements += matches;
                                 console.log(`Replaced text: "${originalText}" -> "${newText}" (${matches} matches)`);
                               }
                             }
                           }
                           return true;
                         });
                         
                         if (replacements > 0) {
                           console.log(`Dispatching transaction with ${replacements} replacements`);
                           view.dispatch(tr);
                           
                           if (window.vimMode.statusElement) {
                             window.vimMode.statusElement.textContent = `Replaced ${replacements} occurrences`;
                             setTimeout(() => {
                               if (window.vimMode && window.vimMode.mode === 'normal' && window.vimMode.statusElement) {
                                 window.vimMode.statusElement.textContent = 'NORMAL';
                               }
                             }, 2000);
                           }
                         } else {
                           console.log('No replacements made');
                           if (window.vimMode.statusElement) {
                             window.vimMode.statusElement.textContent = 'No matches found';
                             setTimeout(() => {
                               if (window.vimMode && window.vimMode.mode === 'normal' && window.vimMode.statusElement) {
                                 window.vimMode.statusElement.textContent = 'NORMAL';
                               }
                             }, 2000);
                           }
                         }
                       } catch (err) {
                         const error = err as Error;
                         console.error('Error during text replacement:', error);
                         if (window.vimMode.statusElement) {
                           window.vimMode.statusElement.textContent = `Error: ${error.message || 'Unknown error'}`;
                           setTimeout(() => {
                             if (window.vimMode && window.vimMode.mode === 'normal' && window.vimMode.statusElement) {
                               window.vimMode.statusElement.textContent = 'NORMAL';
                             }
                           }, 2000);
                         }
                       }
                     }
                     return true;
                   }
                 }
                
                window.vimMode.mode = 'normal';
                if (window.vimMode.statusElement) {
                  window.vimMode.statusElement.textContent = 'NORMAL';
                }
              }
              return false;
            }
            
            if (e.key === 'Escape') {
              e.preventDefault();
              e.stopPropagation();
              
              if (window.vimMode) {
                window.vimMode.mode = 'normal';
                if (window.vimMode.statusElement) {
                  window.vimMode.statusElement.textContent = 'NORMAL';
                }
                commandInput.style.display = 'none';
                window.vimMode.commandBuffer = '';
                
                setTimeout(() => {
                  view.focus();
                }, 10);
              }
              return false;
            }
          });
          
          document.body.appendChild(commandInput);
          
          if (window.vimMode) {
            window.vimMode.statusElement = statusElement;
            window.vimMode.statusLine = statusLine;
            window.vimMode.commandInput = commandInput;
          }
          
          if (window.vimMode.enabled) {
            window.vimMode.mode = 'insert';
            if (window.vimMode.statusElement) {
              window.vimMode.statusElement.textContent = 'INSERT';
            }
          }
          
          if (window.vimMode.statusLine) {
            window.vimMode.statusLine.style.display = window.vimMode.enabled ? 'flex' : 'none';
            
            if (window.vimMode.enabled && window.vimMode.statusLine.firstChild) {
              const leftSide = window.vimMode.statusLine.firstChild as HTMLElement;
              leftSide.innerHTML = '<b>INSERT</b>';
              
              if (window.vimMode.options.getFilename) {
                const filename = window.vimMode.options.getFilename();
                if (filename) {
                  leftSide.innerHTML += ` | ${filename}`;
                }
              }
              
              if (window.vimMode.enabled && window.vimMode.statusLine.lastChild) {
                const rightSide = window.vimMode.statusLine.lastChild as HTMLElement;
                const originalText = rightSide.textContent;
                rightSide.textContent = 'Ctrl+; to toggle vim mode';
                
                setTimeout(() => {
                  if (window.vimMode && window.vimMode.statusLine && window.vimMode.statusLine.lastChild) {
                    const rightSide = window.vimMode.statusLine.lastChild as HTMLElement;
                    rightSide.textContent = originalText || 'Line: 1, Col: 1';
                  }
                }, 3000);
              }
            }
          }
          
          return {
            destroy() {
              statusElement.remove();
              statusLine.remove();
              commandInput.remove();
            },
          };
        },
        
        props: {
          handleKeyDown(view, event) {
            if (!window.vimMode?.enabled) return false;
            
            const { state, dispatch } = view;
            
            if (window.vimMode) {
              const { selection } = state;
              const { $head } = selection;
              
              let line = 1;
              let column = 1;
              let totalLines = 1;
              
              const nodeTypes = new Set();
              state.doc.descendants(node => {
                if (node.type && node.type.name) {
                  nodeTypes.add(node.type.name);
                }
                return true;
              });
              
              console.log("Document node types:", Array.from(nodeTypes));
              
              const lineMap = new Map();
              let visualLine = 1;
              
              const processedPositions = new Set<number>();
              
              state.doc.descendants((node, pos) => {
                if (processedPositions.has(pos)) {
                  return true;
                }
                
                if (node.type.name === 'paragraph' || 
                    node.type.name === 'heading' || 
                    node.type.name === 'codeBlock') {
                  
                  lineMap.set(pos, visualLine);
                  processedPositions.add(pos);
                  
                  let hardBreakCount = 0;
                  node.descendants((childNode, childPos) => {
                    if (childNode.type.name === 'hardBreak') {
                      hardBreakCount++;
                      const absolutePos = pos + childPos + 1;
                      lineMap.set(absolutePos, visualLine + hardBreakCount);
                      processedPositions.add(absolutePos);
                    }
                    return true;
                  });
                  
                  visualLine += Math.max(hardBreakCount, 0) + 1;
                }
                else if (node.type.name === 'listItem') {
                  lineMap.set(pos, visualLine);
                  processedPositions.add(pos);
                  
                  node.descendants((childNode, childPos) => {
                    const childAbsolutePos = pos + childPos;
                    processedPositions.add(childAbsolutePos);
                    
                    if (childNode.type.name === 'hardBreak') {
                      const absolutePos = pos + childPos + 1;
                      lineMap.set(absolutePos, visualLine + 1);
                      visualLine++;
                    }
                    return true;
                  });
                  
                  visualLine++;
                }
                
                return true;
              });
              
              totalLines = Math.max(visualLine - 1, 1);
              
              console.log(`Line structure: totalLines=${totalLines}, visualLine=${visualLine}`);
              console.log('Line map:', Array.from(lineMap.entries()).slice(0, 10));
              
              if (lineMap.has($head.pos)) {
                line = lineMap.get($head.pos);
                console.log(`Found exact cursor position in lineMap: pos=${$head.pos}, line=${line}`);
              } else {
                let closestPos = 0;
                let closestLine = 1;
                
                for (const [pos, lineNum] of lineMap.entries()) {
                  if (pos <= $head.pos && pos >= closestPos) {
                    closestPos = pos;
                    closestLine = lineNum;
                  }
                }
                
                let additionalBreaks = 0;
                state.doc.nodesBetween(closestPos, $head.pos, (node, nodePos) => {
                  if (node.type.name === 'hardBreak' && nodePos <= $head.pos) {
                    additionalBreaks++;
                  }
                  return true;
                });
                
                line = closestLine + additionalBreaks;
              }
              
              line = Math.min(line, totalLines);
              
              let currentNodeStart = 0;
              let foundCurrentNode = false;
              
              state.doc.nodesBetween(0, $head.pos, (node, pos) => {
                if (foundCurrentNode) return false;
                
                if (node.isText && pos <= $head.pos && pos + node.nodeSize > $head.pos) {
                  currentNodeStart = pos;
                  foundCurrentNode = true;
                  return false;
                }
                
                if ((node.type.name === 'paragraph' || node.type.name === 'heading') && 
                    pos + node.nodeSize >= $head.pos) {
                  currentNodeStart = pos;
                }
                
                return true;
              });
              
              column = $head.pos - currentNodeStart;
              
              console.log(`Line calculation: line=${line}, column=${column}, totalLines=${totalLines}`);
              console.log(`Current node starts at ${currentNodeStart}, cursor at ${$head.pos}`);
              
              window.vimMode.cursorPosition = {
                line,
                column,
                totalLines
              };
              
              if (window.vimMode.statusLine) {
                const leftSide = window.vimMode.statusLine.firstChild as HTMLElement;
                const rightSide = window.vimMode.statusLine.lastChild as HTMLElement;
                
                leftSide.innerHTML = `<b>${window.vimMode.mode.toUpperCase()}</b>`;
                
                if (window.vimMode.options.getFilename) {
                  const filename = window.vimMode.options.getFilename();
                  if (filename) {
                    leftSide.innerHTML += ` | ${filename}`;
                  }
                }
                
                rightSide.textContent = `Line: ${line}, Col: ${column} (${totalLines} lines)`;
              }
            }
            
            if (window.vimMode.mode === 'command') {
              console.log(`Command mode key press: ${event.key}`);
              
              if (event.key === 'Escape') {
                window.vimMode.mode = 'normal';
                window.vimMode.statusElement!.textContent = 'NORMAL';
                window.vimMode.commandInput!.style.display = 'none';
                window.vimMode.commandBuffer = '';
                view.focus();
                return true;
              }
              
              if (event.key === 'Enter') {
                console.log('Enter key pressed in command mode');
                const commandInput = window.vimMode.commandBuffer;
                console.log(`Command to execute: "${commandInput}"`);
                window.vimMode.commandInput!.style.display = 'none';
                window.vimMode.commandBuffer = '';
                
                window.vimMode.mode = 'normal';
                window.vimMode.statusElement!.textContent = 'NORMAL';
                
                setTimeout(() => {
                  view.focus();
                }, 10);
                
                if (commandInput.startsWith(':')) {
                  const command = commandInput.substring(1).trim();
                  console.log(`Executing command: '${command}'`);
                  
                  if (command === 'w' || command === 'write') {
                    const saveButtons = Array.from(document.querySelectorAll('button'))
                      .filter(button => {
                        const buttonText = button.textContent?.toLowerCase() || '';
                        return buttonText.includes('save') && !buttonText.includes('saving');
                      });
                    
                    if (saveButtons.length > 0) {
                      console.log('Found Save button, clicking it...');
                      const saveButton = saveButtons[0] as HTMLButtonElement;
                      saveButton.click();
                      
                      window.vimMode.statusElement!.textContent = 'Saved via button';
                      setTimeout(() => {
                        if (window.vimMode.mode === 'normal') {
                          window.vimMode.statusElement!.textContent = 'NORMAL';
                        }
                      }, 2000);
                      return true;
                    }
                    
                    if (window.vimMode.options.onSave) {
                      window.vimMode.options.onSave();
                      
                      window.vimMode.statusElement!.textContent = 'Saved';
                      setTimeout(() => {
                        if (window.vimMode.mode === 'normal') {
                          window.vimMode.statusElement!.textContent = 'NORMAL';
                        }
                      }, 2000);
                    } else {
                      window.vimMode.statusElement!.textContent = 'Save not implemented';
                      setTimeout(() => {
                        if (window.vimMode.mode === 'normal') {
                          window.vimMode.statusElement!.textContent = 'NORMAL';
                        }
                      }, 2000);
                    }
                    return true;
                  }
                  
                  if (command === 'q' || command === 'quit') {
                    if (window.vimMode.options.onQuit) {
                      window.vimMode.options.onQuit();
                    } else {
                      window.vimMode.statusElement!.textContent = 'Quit not implemented';
                      setTimeout(() => {
                        if (window.vimMode.mode === 'normal') {
                          window.vimMode.statusElement!.textContent = 'NORMAL';
                        }
                      }, 2000);
                    }
                    return true;
                  }
                  
                  if (command === 'wq' || command === 'x') {
                    const saveButtons = Array.from(document.querySelectorAll('button'))
                      .filter(button => {
                        const buttonText = button.textContent?.toLowerCase() || '';
                        return buttonText.includes('save') && !buttonText.includes('saving');
                      });
                    
                    let savedViaButton = false;
                    
                    if (saveButtons.length > 0) {
                      console.log('Found Save button, clicking it...');
                      const saveButton = saveButtons[0] as HTMLButtonElement;
                      saveButton.click();
                      savedViaButton = true;
                    }
                    
                    if (window.vimMode.options.onQuit) {
                      if (!savedViaButton && window.vimMode.options.onSave) {
                        window.vimMode.options.onSave();
                      }
                      
                      window.vimMode.options.onQuit();
                      window.vimMode.statusElement!.textContent = 'Saved and quitting';
                    } else {
                      window.vimMode.statusElement!.textContent = savedViaButton ? 
                        'Saved via button (quit not implemented)' : 
                        'Save and quit not implemented';
                      
                      setTimeout(() => {
                        if (window.vimMode.mode === 'normal') {
                          window.vimMode.statusElement!.textContent = 'NORMAL';
                        }
                      }, 2000);
                    }
                    return true;
                  }
                  
                  if (command.includes('s/')) {
                    console.log('Found search and replace pattern');
                    const searchReplaceRegex = /^(%)?s\/(.+?)\/(.*)\/([gi]*)$/;
                    const match = command.match(searchReplaceRegex);
                    
                    if (match) {
                      const [, _percent, pattern, replacement, flags] = match;
                      console.log(`Pattern: '${pattern}', Replacement: '${replacement}', Flags: '${flags}'`);
                      
                      const regex = new RegExp(pattern, flags);
                      const { doc, tr } = state;
                      const text = doc.textContent;
                      
                      let pos = 0;
                      let replacements = 0;
                      let lastPos = 0;
                      
                      text.replace(regex, (match, ...args) => {
                        const offset = args[args.length - 2];
                        const matchLength = match.length;
                        
                        pos = offset;
                        let realPos = 0;
                        let textSoFar = 0;
                        
                        doc.nodesBetween(0, doc.content.size, (node, nodePos) => {
                          if (node.isText) {
                            const endPos = textSoFar + node.text!.length;
                            
                            if (textSoFar <= pos && pos < endPos) {
                              realPos = nodePos + (pos - textSoFar);
                              return false;
                            }
                            
                            textSoFar = endPos;
                          }
                          return true;
                        });
                        
                        if (realPos >= lastPos) {
                          tr.insertText(replacement, realPos, realPos + matchLength);
                          lastPos = realPos + replacement.length;
                          replacements++;
                        }
                        
                        return match;
                      });
                      
                      console.log(`Search and replace: '${pattern}' with '${replacement}', found ${replacements} matches`);
                      
                      if (replacements > 0) {
                        dispatch(tr);
                      }
                      
                      const message = `Replaced ${replacements} occurrences`;
                      window.vimMode.statusElement!.textContent = message;
                      
                      setTimeout(() => {
                        if (window.vimMode.mode === 'normal') {
                          window.vimMode.statusElement!.textContent = 'NORMAL';
                        }
                      }, 2000);
                      
                      return true;
                    }
                  }
                  
                  window.vimMode.statusElement!.textContent = `Command not found: ${command}`;
                  setTimeout(() => {
                    if (window.vimMode.mode === 'normal') {
                      window.vimMode.statusElement!.textContent = 'NORMAL';
                    }
                  }, 2000);
                  
                  return true;
                }
                
                if (commandInput.startsWith('/')) {
                  const searchQuery = commandInput.slice(1);
                  if (searchQuery) {
                    window.vimMode.searchState.query = searchQuery;
                    window.vimMode.searchState.active = true;
                    window.vimMode.searchState.direction = 'forward';
                    window.vimMode.searchState.matches = [];
                    window.vimMode.searchState.currentMatch = -1;
                    
                    const { doc } = state;
                    const text = doc.textContent;
                    const regex = new RegExp(searchQuery, 'gi');
                    let match;
                    
                    while ((match = regex.exec(text)) !== null) {
                      const matchPos = match.index;
                      let realPos = 0;
                      let textSoFar = 0;
                      
                      doc.nodesBetween(0, doc.content.size, (node, nodePos) => {
                        if (node.isText) {
                          const endPos = textSoFar + node.text!.length;
                          
                          if (textSoFar <= matchPos && matchPos < endPos) {
                            realPos = nodePos + (matchPos - textSoFar);
                            return false;
                          }
                          
                          textSoFar = endPos;
                        }
                        return true;
                      });
                      
                      window.vimMode.searchState.matches.push(realPos);
                    }
                    
                    if (window.vimMode.searchState.matches.length > 0) {
                      window.vimMode.searchState.currentMatch = 0;
                      const tr = state.tr.setSelection(
                        TextSelection.create(state.doc, window.vimMode.searchState.matches[0])
                      );
                      dispatch(tr);
                      
                      const message = `Found ${window.vimMode.searchState.matches.length} matches`;
                      window.vimMode.statusElement!.textContent = message;
                      
                      setTimeout(() => {
                        if (window.vimMode.mode === 'normal') {
                          window.vimMode.statusElement!.textContent = 'NORMAL';
                        }
                      }, 2000);
                    } else {
                      window.vimMode.statusElement!.textContent = 'No matches found';
                      
                      setTimeout(() => {
                        if (window.vimMode.mode === 'normal') {
                          window.vimMode.statusElement!.textContent = 'NORMAL';
                        }
                      }, 2000);
                    }
                    
                    return true;
                  }
                }
                
                return true;
              }
              
              if (event.key === 'Backspace') {
                window.vimMode.commandBuffer = window.vimMode.commandBuffer.slice(0, -1);
              } else if (event.key.length === 1) {
                window.vimMode.commandBuffer += event.key;
              }
              
              window.vimMode.commandInput!.value = window.vimMode.commandBuffer;
              return true;
            }
            
            if (event.key === 'Escape' && window.vimMode.mode === 'insert') {
              window.vimMode.mode = 'normal';
              window.vimMode.statusElement!.textContent = 'NORMAL';
              view.focus();
              return true;
            }
            
            if (window.vimMode.mode === 'visual') {
              if (event.key === 'Escape') {
                window.vimMode.mode = 'normal';
                window.vimMode.statusElement!.textContent = 'NORMAL';
                view.focus();
                return true;
              }
              
              return true;
            }
            
            if (window.vimMode.mode === 'normal') {
              if (event.key === ':') {
                window.vimMode.mode = 'command';
                window.vimMode.statusElement!.textContent = 'COMMAND';
                window.vimMode.commandBuffer = ':';
                window.vimMode.commandInput!.value = ':';
                window.vimMode.commandInput!.style.display = 'block';
                window.vimMode.commandInput!.focus();
                console.log('Entered command mode, focusing on input element');
                
                
                setTimeout(() => {
                  if (window.vimMode.commandInput) {
                    window.vimMode.commandInput.focus();
                    console.log('Refocused command input after delay');
                  }
                }, 10);
                
                return true;
              }

              if (/^[0-9]$/.test(event.key) && window.vimMode.commandState.operator === '') {
                window.vimMode.commandState.count += event.key;
                return true;
              }
              
              if (event.key === 'i') {
                window.vimMode.mode = 'insert';
                window.vimMode.statusElement!.textContent = 'INSERT';
                view.focus();
                return true;
              }
              
              if (event.key === 'a') {
                const { $head } = state.selection;
                const pos = $head.pos;
                
                if (pos < state.doc.content.size) {
                  const newPos = Math.min(pos + 1, state.doc.content.size);
                  const tr = state.tr.setSelection(
                    TextSelection.create(state.doc, newPos)
                  );
                  dispatch(tr);
                }
                
                window.vimMode.mode = 'insert';
                window.vimMode.statusElement!.textContent = 'INSERT';
                view.focus();
                return true;
              }

              if (event.key === 'o') {
                const { $head } = state.selection;
                const lineEnd = $head.end();
                
                const tr = state.tr.insert(lineEnd, state.schema.text('\n'));
                tr.setSelection(TextSelection.create(tr.doc, lineEnd + 1));
                dispatch(tr);
                
                window.vimMode.mode = 'insert';
                window.vimMode.statusElement!.textContent = 'INSERT';
                view.focus();
                return true;
              }

              if (event.key === 'O') {
                const { $head } = state.selection;
                const lineStart = $head.start();
                
                const tr = state.tr.insert(lineStart, state.schema.text('\n'));
                tr.setSelection(TextSelection.create(tr.doc, lineStart));
                dispatch(tr);
                
                window.vimMode.mode = 'insert';
                window.vimMode.statusElement!.textContent = 'INSERT';
                view.focus();
                return true;
              }
              
              if (event.key === 'h' || event.key === 'ArrowLeft') {
                const { $head } = state.selection;
                const pos = $head.pos;
                
                if (pos > 0) {
                  const newPos = Math.max(pos - 1, 0);
                  const tr = state.tr.setSelection(
                    TextSelection.create(state.doc, newPos)
                  );
                  dispatch(tr);
                }
                return true;
              }
              
              if (event.key === 'l' || event.key === 'ArrowRight') {
                const { $head } = state.selection;
                const pos = $head.pos;
                
                if (pos < state.doc.content.size) {
                  const newPos = Math.min(pos + 1, state.doc.content.size);
                  const tr = state.tr.setSelection(
                    TextSelection.create(state.doc, newPos)
                  );
                  dispatch(tr);
                }
                return true;
              }
              
              if (event.key === 'j' || event.key === 'ArrowDown') {
                const { selection } = state;
                const { $head } = selection;
                const currentPos = $head.pos;
                
                const linePositions: number[] = [];
                state.doc.descendants((node, pos) => {
                  if (node.type.name === 'paragraph' || 
                      node.type.name === 'heading' || 
                      node.type.name === 'listItem' ||
                      node.type.name === 'codeBlock') {
                    
                    linePositions.push(pos);
                    
                    node.descendants((childNode, childPos) => {
                      if (childNode.type.name === 'hardBreak') {
                        linePositions.push(pos + childPos + 1);
                      }
                      return true;
                    });
                  } else if (node.type.name === 'hardBreak') {
                    linePositions.push(pos + 1);
                  }
                  return true;
                });
                
                linePositions.sort((a, b) => a - b);
                
                let currentLineIndex = -1;
                for (let i = 0; i < linePositions.length; i++) {
                  if (linePositions[i] <= currentPos && 
                      (i === linePositions.length - 1 || linePositions[i + 1] > currentPos)) {
                    currentLineIndex = i;
                    break;
                  }
                }
                
                if (currentLineIndex >= 0 && currentLineIndex < linePositions.length - 1) {
                  const nextLineStart = linePositions[currentLineIndex + 1];
                  const currentLineStart = linePositions[currentLineIndex];
                  const currentColumn = currentPos - currentLineStart;
                  
                  let nextLineEnd = nextLineStart + 100;
                  if (currentLineIndex + 2 < linePositions.length) {
                    nextLineEnd = linePositions[currentLineIndex + 2] - 1;
                  } else {
                    nextLineEnd = state.doc.content.size;
                  }
                  
                  const targetPos = Math.min(nextLineStart + currentColumn, nextLineEnd);
                  
                  if (targetPos !== currentPos && targetPos <= state.doc.content.size) {
                    const tr = state.tr.setSelection(
                      TextSelection.create(state.doc, targetPos)
                    );
                    dispatch(tr);
                  }
                }
                return true;
              }
              
              if (event.key === 'k' || event.key === 'ArrowUp') {
                const { selection } = state;
                const { $head } = selection;
                const currentPos = $head.pos;
                
                const linePositions: number[] = [];
                state.doc.descendants((node, pos) => {
                  if (node.type.name === 'paragraph' || 
                      node.type.name === 'heading' || 
                      node.type.name === 'listItem' ||
                      node.type.name === 'codeBlock') {
                    
                    linePositions.push(pos);
                    
                    node.descendants((childNode, childPos) => {
                      if (childNode.type.name === 'hardBreak') {
                        linePositions.push(pos + childPos + 1);
                      }
                      return true;
                    });
                  } else if (node.type.name === 'hardBreak') {
                    linePositions.push(pos + 1);
                  }
                  return true;
                });
                
                linePositions.sort((a, b) => a - b);
                
                let currentLineIndex = -1;
                for (let i = 0; i < linePositions.length; i++) {
                  if (linePositions[i] <= currentPos && 
                      (i === linePositions.length - 1 || linePositions[i + 1] > currentPos)) {
                    currentLineIndex = i;
                    break;
                  }
                }
                
                if (currentLineIndex > 0) {
                  const prevLineStart = linePositions[currentLineIndex - 1];
                  const currentLineStart = linePositions[currentLineIndex];
                  const currentColumn = currentPos - currentLineStart;
                  
                  let prevLineEnd = currentLineStart - 1;
                  if (currentLineIndex < linePositions.length) {
                    prevLineEnd = linePositions[currentLineIndex] - 1;
                  }
                  
                  const targetPos = Math.min(prevLineStart + currentColumn, prevLineEnd);
                  
                  if (targetPos !== currentPos && targetPos >= 0) {
                    const tr = state.tr.setSelection(
                      TextSelection.create(state.doc, targetPos)
                    );
                    dispatch(tr);
                  }
                }
                return true;
              }

              if (event.key === 'w') {
                const { $head } = state.selection;
                const pos = $head.pos;
                let newPos = pos;
                
                let skippingWhitespace = false;
                const docSize = state.doc.content.size;
                
                for (let i = pos + 1; i < docSize; i++) {
                  const slice = state.doc.textBetween(i, i + 1);
                  
                  if (!slice) continue;
                  
                  const isWordChar = /\w/.test(slice);
                  const isWhitespace = /\s/.test(slice);
                  
                  if (skippingWhitespace) {
                    if (!isWhitespace) {
                      newPos = i;
                      break;
                    }
                  } else {
                    if ((isWordChar && !/\w/.test(state.doc.textBetween(i - 1, i))) || 
                        (!isWordChar && !isWhitespace && /\s/.test(state.doc.textBetween(i - 1, i)))) {
                      newPos = i;
                      break;
                    } else if (isWhitespace && !/\s/.test(state.doc.textBetween(i - 1, i))) {
                      skippingWhitespace = true;
                    }
                  }
                }
                
                if (newPos !== pos) {
                  const tr = state.tr.setSelection(
                    TextSelection.create(state.doc, newPos)
                  );
                  dispatch(tr);
                }
                return true;
              }
              
              if (event.key === 'b') {
                const { $head } = state.selection;
                const pos = $head.pos;
                let newPos = pos;
                
                for (let i = pos - 1; i > 0; i--) {
                  const slice = state.doc.textBetween(i - 1, i);
                  
                  if (!slice) continue;
                  
                  const isWordChar = /\w/.test(slice);
                  const isWhitespace = /\s/.test(slice);
                  
                  if (!isWhitespace && (isWordChar ? !/\w/.test(state.doc.textBetween(i, i + 1)) : 
                                                /\s/.test(state.doc.textBetween(i, i + 1)))) {
                    newPos = i - 1;
                    break;
                  }
                }
                
                if (newPos !== pos) {
                  const tr = state.tr.setSelection(
                    TextSelection.create(state.doc, newPos)
                  );
                  dispatch(tr);
                }
                return true;
              }
              
              if (event.key === 'e') {
                const { $head } = state.selection;
                const pos = $head.pos;
                let newPos = pos;
                
                const docSize = state.doc.content.size;
                let foundWord = false;
                
                for (let i = pos + 1; i < docSize; i++) {
                  const slice = state.doc.textBetween(i - 1, i);
                  const nextChar = state.doc.textBetween(i, i + 1);
                  
                  if (!slice || !nextChar) continue;
                  
                  const isWordChar = /\w/.test(slice);
                  
                  if (isWordChar && !/\w/.test(nextChar)) {
                    newPos = i - 1;
                    foundWord = true;
                    break;
                  } else if (!isWordChar && !/\s/.test(slice) && /\s/.test(nextChar)) {
                    newPos = i - 1;
                    foundWord = true;
                    break;
                  }
                }
                
                if (foundWord) {
                  const tr = state.tr.setSelection(
                    TextSelection.create(state.doc, newPos)
                  );
                  dispatch(tr);
                }
                return true;
              }
              
              if (event.key === 'x') {
                const { $head } = state.selection;
                const pos = $head.pos;
                
                if (pos < state.doc.content.size) {
                  const tr = state.tr.delete(pos, pos + 1);
                  dispatch(tr);
                }
                return true;
              }
              
              if (event.key === 'd') {
                if (window.vimMode.commandState.operator === 'd') {
                  const { $head } = state.selection;
                  const lineStart = $head.start();
                  const lineEnd = $head.end() + 1;
                  
                  const lineContent = state.doc.textBetween(lineStart, lineEnd);
                  window.vimMode.yankRegister = {
                    text: lineContent,
                    linewise: true
                  };
                  
                  const tr = state.tr.delete(lineStart, Math.min(lineEnd, state.doc.content.size));
                  dispatch(tr);
                  
                  window.vimMode.commandState = { count: '', operator: '', motion: '' };
                } else {
                  window.vimMode.commandState.operator = 'd';
                }
                return true;
              }
              
              if (event.key === '$' && window.vimMode.commandState.operator === 'd') {
                const { $head } = state.selection;
                const pos = $head.pos;
                const lineEnd = $head.end();
                
                if (lineEnd > pos) {
                  const text = state.doc.textBetween(pos, lineEnd);
                  window.vimMode.yankRegister = {
                    text,
                    linewise: false
                  };
                  
                  const tr = state.tr.delete(pos, lineEnd);
                  dispatch(tr);
                  
                  window.vimMode.commandState = { count: '', operator: '', motion: '' };
                }
                return true;
              }
              
              if (event.key === 'w' && window.vimMode.commandState.operator === 'd') {
                const { $head } = state.selection;
                const pos = $head.pos;
                let wordEnd = pos;
                
                const docSize = state.doc.content.size;
                for (let i = pos + 1; i < docSize; i++) {
                  const slice = state.doc.textBetween(i - 1, i);
                  const nextChar = state.doc.textBetween(i, i + 1);
                  
                  if (!slice || !nextChar) continue;
                  
                  const isWordChar = /\w/.test(slice);
                  if ((isWordChar && !/\w/.test(nextChar)) ||
                      (!isWordChar && !/\s/.test(slice) && /\s/.test(nextChar))) {
                    wordEnd = i;
                    break;
                  }
                }
                
                if (wordEnd > pos) {
                  const text = state.doc.textBetween(pos, wordEnd);
                  window.vimMode.yankRegister = {
                    text,
                    linewise: false
                  };
                  
                  const tr = state.tr.delete(pos, wordEnd);
                  dispatch(tr);
                }
                
                window.vimMode.commandState = { count: '', operator: '', motion: '' };
                return true;
              }
              
              if (event.key === 'c') {
                if (window.vimMode.commandState.operator === 'c') {
                  const { $head } = state.selection;
                  const lineStart = $head.start();
                  const lineEnd = $head.end();
                  
                  const lineContent = state.doc.textBetween(lineStart, lineEnd);
                  window.vimMode.yankRegister = {
                    text: lineContent,
                    linewise: true
                  };
                  
                  const tr = state.tr.delete(lineStart, lineEnd);
                  tr.setSelection(TextSelection.create(tr.doc, lineStart));
                  dispatch(tr);
                  
                  window.vimMode.mode = 'insert';
                  window.vimMode.statusElement!.textContent = 'INSERT';
                  window.vimMode.commandState = { count: '', operator: '', motion: '' };
                  view.focus();
                } else {
                  window.vimMode.commandState.operator = 'c';
                }
                return true;
              }
              
              if (event.key === 'w' && window.vimMode.commandState.operator === 'c') {
                const { $head } = state.selection;
                const pos = $head.pos;
                let wordEnd = pos;
                
                const docSize = state.doc.content.size;
                for (let i = pos + 1; i < docSize; i++) {
                  const slice = state.doc.textBetween(i - 1, i);
                  const nextChar = state.doc.textBetween(i, i + 1);
                  
                  if (!slice || !nextChar) continue;
                  
                  const isWordChar = /\w/.test(slice);
                  if ((isWordChar && !/\w/.test(nextChar)) ||
                      (!isWordChar && !/\s/.test(slice) && /\s/.test(nextChar))) {
                    wordEnd = i;
                    break;
                  }
                }
                
                if (wordEnd > pos) {
                  const text = state.doc.textBetween(pos, wordEnd);
                  window.vimMode.yankRegister = {
                    text,
                    linewise: false
                  };
                  
                  const tr = state.tr.delete(pos, wordEnd);
                  dispatch(tr);
                  
                  window.vimMode.mode = 'insert';
                  window.vimMode.statusElement!.textContent = 'INSERT';
                  view.focus();
                }
                
                window.vimMode.commandState = { count: '', operator: '', motion: '' };
                return true;
              }
              
              if (event.key === 'y') {
                if (window.vimMode.commandState.operator === 'y') {
                  const { $head } = state.selection;
                  const lineStart = $head.start();
                  const lineEnd = $head.end();
                  const lineContent = state.doc.textBetween(lineStart, lineEnd);
                  window.vimMode.yankRegister = {
                    text: lineContent,
                    linewise: true
                  };
                  
                  window.vimMode.statusElement!.textContent = 'YANKED LINE';
                  setTimeout(() => {
                    if (window.vimMode.mode === 'normal') {
                      window.vimMode.statusElement!.textContent = 'NORMAL';
                    }
                  }, 1000);
                  
                  window.vimMode.commandState = { count: '', operator: '', motion: '' };
                } else {
                  window.vimMode.commandState.operator = 'y';
                }
                return true;
              }
              
              if (event.key === 'p') {
                if (window.vimMode.yankRegister.text) {
                  const { $head } = state.selection;
                  const pos = $head.pos;
                  
                  if (window.vimMode.yankRegister.linewise) {
                    const lineEnd = $head.end();
                    const tr = state.tr.insert(lineEnd, state.schema.text('\n' + window.vimMode.yankRegister.text));
                    dispatch(tr);
                  } else {
                    const tr = state.tr.insert(pos, state.schema.text(window.vimMode.yankRegister.text));
                    dispatch(tr);
                  }
                }
                return true;
              }
              
              if (event.key === 'P') {
                if (window.vimMode.yankRegister.text) {
                  const { $head } = state.selection;
                  const pos = $head.pos;
                  
                  if (window.vimMode.yankRegister.linewise) {
                    const lineStart = $head.start();
                    const tr = state.tr.insert(lineStart, state.schema.text(window.vimMode.yankRegister.text + '\n'));
                    dispatch(tr);
                  } else {
                    const tr = state.tr.insert(pos, state.schema.text(window.vimMode.yankRegister.text));
                    dispatch(tr);
                  }
                }
                return true;
              }
              
              if (event.key === 'g') {
                if (window.vimMode.commandState.operator === 'g') {
                  const tr = state.tr.setSelection(
                    TextSelection.create(state.doc, 0)
                  );
                  dispatch(tr);
                  
                  window.vimMode.commandState = { count: '', operator: '', motion: '' };
                } else {
                  window.vimMode.commandState.operator = 'g';
                }
                return true;
              }
              
              if (event.key === 'G') {
                const endPos = state.doc.content.size;
                const tr = state.tr.setSelection(
                  TextSelection.create(state.doc, endPos)
                );
                dispatch(tr);
                return true;
              }
              
              if (event.key === '0') {
                if (window.vimMode.commandState.count === '') {
                  const { $head } = state.selection;
                  const lineStart = $head.start();
                  
                  const tr = state.tr.setSelection(
                    TextSelection.create(state.doc, lineStart)
                  );
                  dispatch(tr);
                } else {
                  window.vimMode.commandState.count += '0';
                }
                return true;
              }
              
              if (event.key === '$') {
                const { $head } = state.selection;
                const lineEnd = $head.end();
                
                const tr = state.tr.setSelection(
                  TextSelection.create(state.doc, lineEnd)
                );
                dispatch(tr);
                return true;
              }

              if (event.key === 'u') {
                const undoState = view.state.tr.setMeta('history$', { type: 'undo' });
                view.dispatch(undoState);
                return true;
              }

              if (event.key === 'v') {
                window.vimMode.mode = 'visual';
                window.vimMode.statusElement!.textContent = 'VISUAL';
                view.focus();
                return true;
              }
              
              if (event.key === '/') {
                window.vimMode.mode = 'command';
                window.vimMode.statusElement!.textContent = 'SEARCH';
                window.vimMode.commandBuffer = '/';
                window.vimMode.commandInput!.value = '/';
                window.vimMode.commandInput!.style.display = 'block';
                window.vimMode.commandInput!.focus();
                
                window.vimMode.searchState.direction = 'forward';
                window.vimMode.searchState.active = true;
                
                return true;
              }
              
              if (event.key === 'n') {
                if (window.vimMode.searchState.active && window.vimMode.searchState.matches.length > 0) {
                  const { matches, currentMatch } = window.vimMode.searchState;
                  const nextMatch = (currentMatch + 1) % matches.length;
                  
                  window.vimMode.searchState.currentMatch = nextMatch;
                  const tr = state.tr.setSelection(
                    TextSelection.create(state.doc, matches[nextMatch])
                  );
                  dispatch(tr);
                }
                return true;
              }
              
              if (event.key === 'N') {
                if (window.vimMode.searchState.active && window.vimMode.searchState.matches.length > 0) {
                  const { matches, currentMatch } = window.vimMode.searchState;
                  const prevMatch = (currentMatch - 1 + matches.length) % matches.length;
                  
                  window.vimMode.searchState.currentMatch = prevMatch;
                  const tr = state.tr.setSelection(
                    TextSelection.create(state.doc, matches[prevMatch])
                  );
                  dispatch(tr);
                }
                return true;
              }

              if (event.key === 'r' && event.ctrlKey) {
                const redoState = view.state.tr.setMeta('history$', { type: 'redo' });
                view.dispatch(redoState);
                return true;
              }

              if (event.key === '>') {
                if (window.vimMode.commandState.operator === '>') {
                  const { $head } = state.selection;
                  const lineStart = $head.start();
                  
                  const tr = state.tr.insert(lineStart, state.schema.text('  '));
                  dispatch(tr);
                  
                  window.vimMode.commandState = { count: '', operator: '', motion: '' };
                } else {
                  window.vimMode.commandState.operator = '>';
                }
                return true;
              }

              if (event.key === '<') {
                if (window.vimMode.commandState.operator === '<') {
                  const { $head } = state.selection;
                  const lineStart = $head.start();
                  
                  const lineText = state.doc.textBetween(lineStart, lineStart + 2);
                  if (lineText.startsWith('  ')) {
                    const tr = state.tr.delete(lineStart, lineStart + 2);
                    dispatch(tr);
                  }
                  
                  window.vimMode.commandState = { count: '', operator: '', motion: '' };
                } else {
                  window.vimMode.commandState.operator = '<';
                }
                return true;
              }

              if (event.key === 'V') {
                const { $head } = state.selection;
                const lineStart = $head.start();
                const lineEnd = $head.end();
                
                const tr = state.tr.setSelection(
                  TextSelection.create(state.doc, lineStart, lineEnd)
                );
                dispatch(tr);
                
                window.vimMode.mode = 'visual';
                window.vimMode.statusElement!.textContent = 'VISUAL LINE';
                view.focus();
                return true;
              }

              if (event.key === 'G' && window.vimMode.commandState.count !== '') {
                const lineNumber = parseInt(window.vimMode.commandState.count, 10);
                let linePos = 0;
                let currentLine = 1;
                
                state.doc.nodesBetween(0, state.doc.content.size, (node, pos) => {
                  if (node.isText && node.text!.includes('\n')) {
                    const lines = node.text!.split('\n');
                    for (let i = 0; i < lines.length; i++) {
                      if (currentLine === lineNumber) {
                        linePos = pos + lines[i].length;
                        return false;
                      }
                      if (i < lines.length - 1) {
                        currentLine++;
                      }
                    }
                  }
                  return true;
                });
                
                const tr = state.tr.setSelection(
                  TextSelection.create(state.doc, linePos)
                );
                dispatch(tr);
                
                window.vimMode.commandState = { count: '', operator: '', motion: '' };
                return true;
              }

              window.vimMode.commandState = { count: '', operator: '', motion: '' };
              
              return true;
            }
            
            return false;
          },
        },
      }),
    ];
  },
});

function saveVimModeState(isEnabled: boolean) {
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem('trustynotes_vim_mode_enabled', isEnabled ? 'true' : 'false');
      console.log(`Saved Vim mode state: ${isEnabled}`);
    } catch (e) {
      console.warn('Failed to save Vim mode state to localStorage:', e);
    }
  }
}

export function loadVimModeState(): boolean {
  if (typeof window !== 'undefined') {
    try {
      const savedState = localStorage.getItem('trustynotes_vim_mode_enabled');
      if (savedState !== null) {
        return savedState === 'true';
      }
    } catch (e) {
      console.warn('Failed to load Vim mode state from localStorage:', e);
    }
  }
  return false;
}

export function toggleVimMode() {
  if (typeof window !== 'undefined' && window.vimMode) {
    window.vimMode.enabled = !window.vimMode.enabled;
    
    saveVimModeState(window.vimMode.enabled);
    
    if (window.vimMode.statusElement) {
      window.vimMode.statusElement.style.display = window.vimMode.enabled ? 'block' : 'none';
      
      if (window.vimMode.enabled) {
        window.vimMode.mode = 'insert';
        if (window.vimMode.statusElement) {
          window.vimMode.statusElement.textContent = 'INSERT';
        }
      }
    }
    
    if (window.vimMode.statusLine) {
      window.vimMode.statusLine.style.display = window.vimMode.enabled ? 'flex' : 'none';
      
      if (window.vimMode.enabled && window.vimMode.statusLine.firstChild) {
        const leftSide = window.vimMode.statusLine.firstChild as HTMLElement;
        leftSide.innerHTML = '<b>INSERT</b>';
        
        if (window.vimMode.options.getFilename) {
          const filename = window.vimMode.options.getFilename();
          if (filename) {
            leftSide.innerHTML += ` | ${filename}`;
          }
        }
        
        if (window.vimMode.enabled && window.vimMode.statusLine.lastChild) {
          const rightSide = window.vimMode.statusLine.lastChild as HTMLElement;
          const originalText = rightSide.textContent;
          rightSide.textContent = 'Ctrl+; to toggle vim mode';
          
          setTimeout(() => {
            if (window.vimMode && window.vimMode.statusLine && window.vimMode.statusLine.lastChild) {
              const rightSide = window.vimMode.statusLine.lastChild as HTMLElement;
              rightSide.textContent = originalText || 'Line: 1, Col: 1';
            }
          }, 3000);
        }
      }
    }
    
    if (window.vimMode.commandInput) {
      window.vimMode.commandInput.style.display = 'none';
    }
    
    return window.vimMode.enabled;
  }
  
  return false;
} 