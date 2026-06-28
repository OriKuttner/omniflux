class HtmlEditor extends HTMLElement {
  static get observedAttributes() {
    return ['content', 'dir'];
  }

  constructor() {
    super();
    this.isCodeMode = false;
    this.content = '';
    this.lastSavedContent = '';
    this.direction = 'ltr';
  }

  connectedCallback() {
    this.content = this.getAttribute('content') || '';
    this.lastSavedContent = this.content;
    this.direction = this.getAttribute('dir') || 'ltr';
    this.render();
    this.initElements();
    this.addEventListeners();
    this.updateDirectionUI();
    this.updateToolbarState();
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue === newValue) return;

    if (name === 'content') {
      this.content = newValue || '';
      if (!this.isCodeMode && this.visualEditor) {
        if (document.activeElement !== this.visualEditor && this.visualEditor.innerHTML !== this.content) {
          this.visualEditor.innerHTML = this.content;
        }
      } else if (this.codeEditor) {
        this.codeEditor.value = this.content;
      }
    } else if (name === 'dir') {
      this.direction = newValue || 'ltr';
      this.updateDirectionUI();
    }
  }

  render() {
    this.innerHTML = `
      <div class="html-editor-container">
        <!-- Toolbar (visible in both modes to allow toggling) -->
        <div class="editor-toolbar mb-2" style="background-color: #f8f9fa; padding: 5px; border-radius: 4px; border: 1px solid #dee2e6; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap;">
          <!-- Right side: Formatting buttons -->
          <div class="d-flex gap-1 flex-wrap align-items-center toolbar-formatting">
            <button type="button" class="btn btn-sm btn-outline-secondary btn-bold"><b>B</b></button>
            <button type="button" class="btn btn-sm btn-outline-secondary btn-italic"><i>I</i></button>
            <button type="button" class="btn btn-sm btn-outline-secondary btn-underline"><u>U</u></button>
            <div style="border-left: 1px solid #dee2e6; height: 20px; margin: 0 4px;"></div>
            <button type="button" class="btn btn-sm btn-outline-secondary btn-h1">H1</button>
            <button type="button" class="btn btn-sm btn-outline-secondary btn-h2">H2</button>
            <button type="button" class="btn btn-sm btn-outline-secondary btn-h3">H3</button>
            <button type="button" class="btn btn-sm btn-outline-secondary btn-p">P</button>
            <div style="border-left: 1px solid #dee2e6; height: 20px; margin: 0 4px;"></div>
            <button type="button" class="btn btn-sm btn-outline-secondary btn-ul"><i class="fa fa-list-ul"></i></button>
            <button type="button" class="btn btn-sm btn-outline-secondary btn-ol"><i class="fa fa-list-ol"></i></button>
            <div style="border-left: 1px solid #dee2e6; height: 20px; margin: 0 4px;"></div>
            <button type="button" class="btn btn-sm btn-outline-secondary btn-ltr" title="שמאל לימין (LTR)">LTR</button>
            <button type="button" class="btn btn-sm btn-outline-secondary btn-rtl" title="ימין לשמאל (RTL)">RTL</button>
          </div>
          <div class="code-mode-title d-none" style="font-weight: bold; padding: 0 8px; color: #6c757d;">עריכת קוד מקור (HTML)</div>
          
          <!-- Left side: Save & Toggle actions -->
          <div class="d-flex gap-1 align-items-center">
            <button type="button" class="btn btn-sm btn-success btn-save">
              <i class="fa fa-save me-1"></i> שמירה
            </button>
            <button type="button" class="btn btn-sm btn-secondary btn-toggle">
              <i class="fa fa-code me-1 btn-toggle-icon"></i>
              <span class="btn-toggle-text">קוד HTML</span>
            </button>
          </div>
        </div>

        <!-- Visual Editor -->
        <div class="form-group visual-editor-wrapper">
          <div class="editor-content form-control visual-editor" contenteditable="true" style="border: 1px solid #ced4da; border-radius: 0.25rem; padding: 12px; background-color: #fff; height: 400px; overflow-y: auto;"></div>
        </div>

        <!-- HTML Code Editor -->
        <div class="form-group code-editor-wrapper d-none">
          <textarea class="form-control code-editor" rows="12" style="direction: ltr; font-family: monospace; height: 400px; overflow-y: auto; resize: vertical;"></textarea>
        </div>
      </div>
    `;
  }

  initElements() {
    this.visualEditor = this.querySelector('.visual-editor');
    this.codeEditor = this.querySelector('.code-editor');
    this.visualWrapper = this.querySelector('.visual-editor-wrapper');
    this.codeWrapper = this.querySelector('.code-editor-wrapper');
    
    this.btnBold = this.querySelector('.btn-bold');
    this.btnItalic = this.querySelector('.btn-italic');
    this.btnUnderline = this.querySelector('.btn-underline');
    this.btnH1 = this.querySelector('.btn-h1');
    this.btnH2 = this.querySelector('.btn-h2');
    this.btnH3 = this.querySelector('.btn-h3');
    this.btnP = this.querySelector('.btn-p');
    this.btnUl = this.querySelector('.btn-ul');
    this.btnOl = this.querySelector('.btn-ol');
    this.btnLtr = this.querySelector('.btn-ltr');
    this.btnRtl = this.querySelector('.btn-rtl');
    
    this.btnSave = this.querySelector('.btn-save');
    this.btnToggle = this.querySelector('.btn-toggle');
    this.btnToggleIcon = this.querySelector('.btn-toggle-icon');
    this.btnToggleText = this.querySelector('.btn-toggle-text');
    this.toolbarFormatting = this.querySelector('.toolbar-formatting');
    this.codeModeTitle = this.querySelector('.code-mode-title');

    this.visualEditor.innerHTML = this.content;
    this.codeEditor.value = this.content;
  }

  addEventListeners() {
    const exec = (cmd, val = '') => {
      document.execCommand(cmd, false, val);
      this.updateContentFromVisual();
      this.updateToolbarState();
    };

    this.btnBold.addEventListener('click', () => exec('bold'));
    this.btnItalic.addEventListener('click', () => exec('italic'));
    this.btnUnderline.addEventListener('click', () => exec('underline'));
    this.btnH1.addEventListener('click', () => exec('formatBlock', 'H1'));
    this.btnH2.addEventListener('click', () => exec('formatBlock', 'H2'));
    this.btnH3.addEventListener('click', () => exec('formatBlock', 'H3'));
    this.btnP.addEventListener('click', () => exec('formatBlock', 'P'));
    this.btnUl.addEventListener('click', () => exec('insertUnorderedList'));
    this.btnOl.addEventListener('click', () => exec('insertOrderedList'));
    this.btnLtr.addEventListener('click', () => {
      this.setAttribute('dir', 'ltr');
    });
    this.btnRtl.addEventListener('click', () => {
      this.setAttribute('dir', 'rtl');
    });

    this.btnToggle.addEventListener('click', () => this.toggleCodeMode());
    this.btnSave.addEventListener('click', () => this.triggerSave());

    this.visualEditor.addEventListener('input', () => this.updateContentFromVisual());
    this.visualEditor.addEventListener('keyup', () => this.updateToolbarState());
    this.visualEditor.addEventListener('mouseup', () => this.updateToolbarState());
    this.visualEditor.addEventListener('click', () => this.updateToolbarState());
    this.visualEditor.addEventListener('focus', () => this.updateToolbarState());
    
    this.visualEditor.addEventListener('blur', (e) => this.handleBlur(e));
    
    this.codeEditor.addEventListener('input', () => {
      this.content = this.codeEditor.value;
      this.dispatchEvent(new CustomEvent('contentchange', { detail: this.content }));
    });
    this.codeEditor.addEventListener('blur', (e) => this.handleBlur(e));
  }

  toggleCodeMode() {
    this.isCodeMode = !this.isCodeMode;
    if (this.isCodeMode) {
      this.codeEditor.value = this.content;
      this.visualWrapper.classList.add('d-none');
      this.codeWrapper.classList.remove('d-none');
      this.toolbarFormatting.classList.add('d-none');
      this.codeModeTitle.classList.remove('d-none');
      this.btnToggleIcon.className = 'fa fa-eye me-1 btn-toggle-icon';
      this.btnToggleText.textContent = 'תצוגה חזותית';
    } else {
      this.visualEditor.innerHTML = this.content;
      this.visualWrapper.classList.remove('d-none');
      this.codeWrapper.classList.add('d-none');
      this.toolbarFormatting.classList.remove('d-none');
      this.codeModeTitle.classList.add('d-none');
      this.btnToggleIcon.className = 'fa fa-code me-1 btn-toggle-icon';
      this.btnToggleText.textContent = 'קוד HTML';
      setTimeout(() => this.updateToolbarState());
    }
  }

  updateContentFromVisual() {
    this.content = this.visualEditor.innerHTML;
    this.dispatchEvent(new CustomEvent('contentchange', { detail: this.content }));
  }

  updateDirectionUI() {
    if (!this.visualEditor) return;
    
    const dir = (this.direction === 'rtl') ? 'rtl' : 'ltr';
    this.visualEditor.style.direction = dir;
    this.visualEditor.style.textAlign = (dir === 'rtl') ? 'right' : 'left';
    
    if (this.btnLtr && this.btnRtl) {
      this.toggleButtonActive(this.btnLtr, dir === 'ltr');
      this.toggleButtonActive(this.btnRtl, dir === 'rtl');
    }
  }

  updateToolbarState() {
    if (this.isCodeMode) return;
    
    const isBold = document.queryCommandState('bold');
    const isItalic = document.queryCommandState('italic');
    const isUnderline = document.queryCommandState('underline');
    const isUl = document.queryCommandState('insertUnorderedList');
    const isOl = document.queryCommandState('insertOrderedList');

    let format = '';
    try {
      format = document.queryCommandValue('formatBlock');
    } catch (e) {}
    const formatBlock = format ? format.toLowerCase().replace(/[<>]/g, '').trim() : '';

    this.toggleButtonActive(this.btnBold, isBold);
    this.toggleButtonActive(this.btnItalic, isItalic);
    this.toggleButtonActive(this.btnUnderline, isUnderline);
    this.toggleButtonActive(this.btnUl, isUl);
    this.toggleButtonActive(this.btnOl, isOl);

    this.toggleButtonActive(this.btnH1, formatBlock === 'h1');
    this.toggleButtonActive(this.btnH2, formatBlock === 'h2');
    this.toggleButtonActive(this.btnH3, formatBlock === 'h3');
    this.toggleButtonActive(this.btnP, ['p', 'normal', 'div'].includes(formatBlock));

    const dir = this.direction || 'ltr';
    this.toggleButtonActive(this.btnLtr, dir === 'ltr');
    this.toggleButtonActive(this.btnRtl, dir === 'rtl');
  }

  toggleButtonActive(btn, isActive) {
    if (isActive) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  }

  triggerSave() {
    if (this.content !== this.lastSavedContent) {
      this.lastSavedContent = this.content;
      this.dispatchEvent(new CustomEvent('save', { detail: this.content }));
    }
  }

  handleBlur(event) {
    setTimeout(() => {
      if (!this.contains(document.activeElement)) {
        this.triggerSave();
      }
    }, 150);
  }
}

customElements.define('html-editor', HtmlEditor);
