import { Extension } from '@tiptap/core';
import { keymap } from 'prosemirror-keymap';

export const KeySwapExtension = Extension.create({
  name: 'keySwap',

  addKeyboardShortcuts() {
    return {
      Enter: ({ editor }) => {
        return editor.commands.setHardBreak();
      },
      'Shift-Enter': ({ editor }) => {
        return editor.commands.splitBlock();
      },
    };
  },

  addProseMirrorPlugins() {
    return [
      keymap({
        Enter: (state, dispatch) => {
          if (dispatch) {
            const { tr } = state;
            tr.replaceSelectionWith(state.schema.nodes.hardBreak.create()).scrollIntoView();
            dispatch(tr);
          }
          return true;
        },
        'Shift-Enter': (state, dispatch) => {
          if (dispatch) {
            const { tr } = state;
            tr.split(tr.selection.from);
            dispatch(tr);
          }
          return true;
        },
      }),
    ];
  },
}); 