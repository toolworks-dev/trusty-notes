// Create a namespace for our editor
window.tiptap = {};

// Initialize core editor functionality
window.tiptap.Editor = class {
  constructor(options) {
    this.element = options.element;
    this.content = options.content || '';
    this.editable = options.editable || true;
    
    // Create basic editor functionality
    this.element.contentEditable = this.editable;
    this.element.innerHTML = this.content;
    
    // Basic commands
    this.commands = {
      focus: (position) => {
        this.element.focus();
        if (position === 'end') {
          // Move cursor to end
          const range = document.createRange();
          const sel = window.getSelection();
          range.selectNodeContents(this.element);
          range.collapse(false);
          sel.removeAllRanges();
          sel.addRange(range);
        }
      }
    };
  }

  setEditable(value) {
    this.editable = value;
    this.element.contentEditable = value;
  }

  destroy() {
    this.element.innerHTML = '';
    this.element.contentEditable = false;
  }

  getHTML() {
    return this.element.innerHTML;
  }
};

// Basic starter kit with minimal formatting
window.tiptap.StarterKit = {
  // Add basic keyboard handlers and formatting if needed
};

// Signal that our simplified editor is ready
window.dispatchEvent(new Event('tiptap-ready')); 