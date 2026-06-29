class HtmlEditor extends HTMLElement {
  static get observedAttributes() {
    return ['content', 'dir', 'name'];
  }

  constructor() {
    super();
    this.isCodeMode = false;
    this._content = '';
    this.lastSavedContent = '';
    this.direction = 'ltr';
    this.nameAttr = '';
  }

  get content() {
    return this._content;
  }

  set content(val) {
    this._content = val || '';
    if (this.hiddenInput) {
      this.hiddenInput.value = this._content;
    }
  }

  connectedCallback() {
    this.nameAttr = this.getAttribute('name') || '';
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
    } else if (name === 'name') {
      this.nameAttr = newValue || '';
      if (this.hiddenInput) {
        this.hiddenInput.name = this.nameAttr;
      }
    }
  }

  render() {
    const cancelUrl = this.getAttribute('cancel-url') || '';
    this.innerHTML = `
      <div class="html-editor-container">
        <!-- Toolbar (visible in both modes to allow toggling) -->
        <div class="editor-toolbar mb-2" style="background-color: #f8f9fa; padding: 5px; border-radius: 4px; border: 1px solid #dee2e6; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;">
          <!-- Right side: Formatting buttons -->
          <div class="toolbar-formatting" style="display: flex; gap: 4px; flex-wrap: wrap; align-items: center;">
            <button type="button" class="btn btn-sm btn-default btn-bold" title="Bold (Ctrl+B)"><b>B</b></button>
            <button type="button" class="btn btn-sm btn-default btn-italic" title="Italic (Ctrl+I)"><i>I</i></button>
            <button type="button" class="btn btn-sm btn-default btn-underline" title="Underline (Ctrl+U)"><u>U</u></button>
            <div style="border-left: 1px solid #dee2e6; height: 20px; margin: 0 4px; display: inline-block; vertical-align: middle;"></div>
            <button type="button" class="btn btn-sm btn-default btn-h1" title="Heading 1">H1</button>
            <button type="button" class="btn btn-sm btn-default btn-h2" title="Heading 2">H2</button>
            <button type="button" class="btn btn-sm btn-default btn-h3" title="Heading 3">H3</button>
            <button type="button" class="btn btn-sm btn-default btn-p" title="Paragraph">P</button>
            <div style="border-left: 1px solid #dee2e6; height: 20px; margin: 0 4px; display: inline-block; vertical-align: middle;"></div>
            <button type="button" class="btn btn-sm btn-default btn-ul" title="Unordered List"><i class="fa fa-list-ul"></i></button>
            <button type="button" class="btn btn-sm btn-default btn-ol" title="Ordered List"><i class="fa fa-list-ol"></i></button>
            <div style="border-left: 1px solid #dee2e6; height: 20px; margin: 0 4px; display: inline-block; vertical-align: middle;"></div>
            <button type="button" class="btn btn-sm btn-default btn-image" title="Insert Image"><i class="fa fa-image"></i></button>
            <button type="button" class="btn btn-sm btn-default btn-insert-link" title="Insert Link"><i class="fa fa-link"></i></button>
            <div style="border-left: 1px solid #dee2e6; height: 20px; margin: 0 4px; display: inline-block; vertical-align: middle;"></div>
            <button type="button" class="btn btn-sm btn-default btn-ltr" title="Left to Right (LTR)">
              <span style="display: inline-block; position: relative; width: 14px; height: 14px; line-height: 14px; vertical-align: middle;">
                <i class="fa fa-paragraph" style="font-size: 10px; opacity: 0.8; position: absolute; top: 0; left: 0;"></i>
                <i class="fa fa-arrow-right" style="font-size: 7px; position: absolute; bottom: -2px; right: -4px; color: #333;"></i>
              </span>
            </button>
            <button type="button" class="btn btn-sm btn-default btn-rtl" title="Right to Left (RTL)">
              <span style="display: inline-block; position: relative; width: 14px; height: 14px; line-height: 14px; vertical-align: middle;">
                <i class="fa fa-paragraph" style="font-size: 10px; opacity: 0.8; position: absolute; top: 0; right: 0;"></i>
                <i class="fa fa-arrow-left" style="font-size: 7px; position: absolute; bottom: -2px; left: -4px; color: #333;"></i>
              </span>
            </button>
          </div>
          <div class="code-mode-title" style="display: none; font-weight: bold; padding: 0 8px; color: #6c757d;">עריכת קוד מקור (HTML)</div>
          
          <!-- Left side: Save, Cancel & Toggle actions -->
          <div style="display: flex; gap: 4px; align-items: center;">
            <button type="button" class="btn btn-sm btn-success btn-save" style="font-weight: bold;">
              <i class="fa fa-save" style="margin-left: 4px;"></i>שמור ופרסם
            </button>
            ${cancelUrl ? `
            <a href="${cancelUrl}" class="btn btn-sm btn-default btn-cancel" style="border: 1px solid #ccc; text-decoration: none;">
              <i class="fa fa-times" style="margin-left: 4px; color: #d9534f;"></i>ביטול
            </a>
            ` : ''}
            <button type="button" class="btn btn-sm btn-primary btn-toggle">
              <i class="fa fa-code btn-toggle-icon" style="margin-left: 4px;"></i>
              <span class="btn-toggle-text">ערוך קוד</span>
            </button>
          </div>
        </div>

        <!-- Visual Editor -->
        <div class="form-group visual-editor-wrapper">
          <div class="editor-content form-control visual-editor" contenteditable="true" style="border: 1px solid #ced4da; border-radius: 0.25rem; padding: 12px; background-color: #fff; height: 400px; overflow-y: auto;"></div>
        </div>

        <!-- HTML Code Editor -->
        <div class="form-group code-editor-wrapper" style="display: none;">
          <textarea class="form-control code-editor" rows="12" style="direction: ltr; font-family: monospace; height: 400px; overflow-y: auto; resize: vertical;"></textarea>
        </div>

        <!-- Custom Link Modal -->
        <div class="link-modal" style="display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0, 0, 0, 0.4); z-index: 10000; justify-content: center; align-items: center; backdrop-filter: blur(2px);">
          <div class="link-modal-content" style="background: white; border-radius: 8px; padding: 20px; width: 90%; max-width: 400px; box-shadow: 0 4px 15px rgba(0,0,0,0.2); direction: rtl; text-align: right; font-family: sans-serif; border: 1px solid #ddd;">
            <h4 style="margin-top: 0; margin-bottom: 15px; font-weight: bold; color: #333; border-bottom: 1px solid #eee; padding-bottom: 10px;">הוספת / עריכת קישור</h4>
            <div class="form-group mb-3">
              <label style="display: block; margin-bottom: 5px; font-weight: 500; font-size: 13px; color: #555;">כתובת הקישור (URL):</label>
              <input type="text" class="link-url-input form-control" placeholder="https://example.com" style="width: 100%; direction: ltr; text-align: left;">
            </div>
            <div class="form-group mb-3 link-text-group">
              <label style="display: block; margin-bottom: 5px; font-weight: 500; font-size: 13px; color: #555;">טקסט להצגה:</label>
              <input type="text" class="link-text-input form-control" style="width: 100%;">
            </div>
            <div style="display: flex; justify-content: flex-end; gap: 8px; margin-top: 20px;">
              <button type="button" class="btn btn-default btn-sm link-cancel-btn">ביטול</button>
              <button type="button" class="btn btn-primary btn-sm link-save-btn">שמור</button>
            </div>
          </div>
        </div>

        <!-- Hidden input for standard form integration -->
        ${this.nameAttr ? `<textarea class="hidden-form-input" name="${this.nameAttr}" style="display: none;"></textarea>` : ''}
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
    this.btnImage = this.querySelector('.btn-image');
    this.btnLink = this.querySelector('.btn-insert-link');
    this.btnLtr = this.querySelector('.btn-ltr');
    this.btnRtl = this.querySelector('.btn-rtl');
    
    this.btnSave = this.querySelector('.btn-save');
    this.btnToggle = this.querySelector('.btn-toggle');
    this.btnToggleIcon = this.querySelector('.btn-toggle-icon');
    this.btnToggleText = this.querySelector('.btn-toggle-text');
    this.toolbarFormatting = this.querySelector('.toolbar-formatting');
    this.codeModeTitle = this.querySelector('.code-mode-title');

    this.linkModal = this.querySelector('.link-modal');
    this.modalUrlInput = this.querySelector('.link-url-input');
    this.modalTextInput = this.querySelector('.link-text-input');
    this.modalTextGroup = this.querySelector('.link-text-group');
    this.modalCancelBtn = this.querySelector('.link-cancel-btn');
    this.modalSaveBtn = this.querySelector('.link-save-btn');

    if (this.nameAttr) {
      this.hiddenInput = this.querySelector('.hidden-form-input');
      if (this.hiddenInput) {
        this.hiddenInput.value = this.content;
      }
    }

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
    
    this.btnImage.addEventListener('click', () => {
      const selection = window.getSelection();
      const range = selection.rangeCount > 0 ? selection.getRangeAt(0) : null;

      const fileInput = document.createElement('input');
      fileInput.type = 'file';
      fileInput.accept = 'image/*';
      fileInput.onchange = async () => {
        if (fileInput.files.length === 0) return;
        const file = fileInput.files[0];
        const formData = new FormData();
        formData.append('file', file);
        
        try {
          const res = await fetch('/api/upload', {
            method: 'POST',
            body: formData
          });
          const data = await res.json();
          if (data.location) {
            if (range) {
              selection.removeAllRanges();
              selection.addRange(range);
            } else {
              this.visualEditor.focus();
            }
            document.execCommand('insertImage', false, data.location);
            this.updateContentFromVisual();
          } else {
            alert('Upload failed: ' + (data.error || 'Unknown error'));
          }
        } catch (err) {
          alert('Upload failed: ' + err.message);
        }
      };
      fileInput.click();
    });

    this.btnLink.addEventListener('click', () => {
      if (this.isCodeMode) return;
      this.showLinkModal();
    });

    this.modalCancelBtn.addEventListener('click', () => this.closeLinkModal());
    this.modalSaveBtn.addEventListener('click', () => this.saveLink());

    this.linkModal.addEventListener('click', (e) => {
      if (e.target === this.linkModal) {
        this.closeLinkModal();
      }
    });

    const handleKey = (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        this.saveLink();
      } else if (e.key === 'Escape') {
        this.closeLinkModal();
      }
    };
    this.modalUrlInput.addEventListener('keydown', handleKey);
    this.modalTextInput.addEventListener('keydown', handleKey);

    this.btnLtr.addEventListener('click', () => {
      this.setAttribute('dir', 'ltr');
    });
    this.btnRtl.addEventListener('click', () => {
      this.setAttribute('dir', 'rtl');
    });

    this.btnToggle.addEventListener('click', () => this.toggleCodeMode());
    this.btnSave.addEventListener('click', () => {
      if (this.isCodeMode) {
        this.content = this.codeEditor.value;
      } else {
        this.content = this.visualEditor.innerHTML;
      }
      this.triggerSave(true);
      const parentForm = this.closest('form');
      if (parentForm) {
        const submitBtn = document.createElement('button');
        submitBtn.type = 'submit';
        submitBtn.style.display = 'none';
        parentForm.appendChild(submitBtn);
        submitBtn.click();
        parentForm.removeChild(submitBtn);
      }
    });

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
      this.visualWrapper.style.display = 'none';
      this.codeWrapper.style.display = 'block';
      this.toolbarFormatting.style.display = 'none';
      this.codeModeTitle.style.display = 'inline-block';
      this.btnToggleIcon.className = 'fa fa-eye btn-toggle-icon';
      this.btnToggleText.textContent = 'Visual View';
    } else {
      this.visualEditor.innerHTML = this.content;
      this.visualWrapper.style.display = 'block';
      this.codeWrapper.style.display = 'none';
      this.toolbarFormatting.style.display = 'flex';
      this.codeModeTitle.style.display = 'none';
      this.btnToggleIcon.className = 'fa fa-code btn-toggle-icon';
      this.btnToggleText.textContent = 'HTML Code';
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

    const hasLink = this.getClosestAnchor() !== null;
    this.toggleButtonActive(this.btnLink, hasLink);
  }

  toggleButtonActive(btn, isActive) {
    if (isActive) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  }

  triggerSave(force = false) {
    if (force || this.content !== this.lastSavedContent) {
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

  getClosestAnchor() {
    const selection = window.getSelection();
    if (selection.rangeCount === 0) return null;
    let node = selection.getRangeAt(0).startContainer;
    while (node && node !== this.visualEditor) {
      if (node.nodeName === 'A') {
        return node;
      }
      node = node.parentNode;
    }
    return null;
  }

  showLinkModal() {
    const anchor = this.getClosestAnchor();
    const selection = window.getSelection();
    const selectedText = selection.toString().trim();

    this.savedRange = selection.rangeCount > 0 ? selection.getRangeAt(0).cloneRange() : null;

    if (anchor) {
      this.modalUrlInput.value = anchor.getAttribute('href') || '';
      this.modalTextInput.value = anchor.innerText;
    } else {
      this.modalUrlInput.value = 'https://';
      this.modalTextInput.value = selectedText;
    }

    this.linkModal.style.display = 'flex';
    this.modalUrlInput.focus();
    this.modalUrlInput.select();
  }

  closeLinkModal() {
    this.linkModal.style.display = 'none';
    if (this.savedRange) {
      const selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(this.savedRange);
    }
    this.visualEditor.focus();
    this.savedRange = null;
    this.updateToolbarState();
  }

  saveLink() {
    const url = this.modalUrlInput.value.trim();
    const text = this.modalTextInput.value.trim();

    // Restore selection first so DOM edits apply to the correct cursor location
    const selection = window.getSelection();
    selection.removeAllRanges();
    if (this.savedRange) {
      selection.addRange(this.savedRange);
    }

    const anchor = this.getClosestAnchor();
    if (anchor) {
      if (!url || url === 'https://') {
        const parent = anchor.parentNode;
        while (anchor.firstChild) {
          parent.insertBefore(anchor.firstChild, anchor);
        }
        parent.removeChild(anchor);
        this.savedRange = null;
      } else {
        anchor.href = url;
        if (text) {
          anchor.innerText = text;
        }
        this.savedRange = document.createRange();
        this.savedRange.selectNodeContents(anchor);
      }
    } else {
      if (!url || url === 'https://') {
        this.closeLinkModal();
        return;
      }

      const newAnchor = document.createElement('a');
      newAnchor.href = url;
      
      if (this.savedRange && !this.savedRange.collapsed) {
        newAnchor.appendChild(this.savedRange.extractContents());
      } else {
        newAnchor.innerText = text || url;
      }

      if (this.savedRange) {
        this.savedRange.insertNode(newAnchor);
        const newRange = document.createRange();
        newRange.setStartAfter(newAnchor);
        newRange.setEndAfter(newAnchor);
        this.savedRange = newRange;
      } else {
        this.visualEditor.appendChild(newAnchor);
        this.savedRange = null;
      }
    }

    this.updateContentFromVisual();
    this.closeLinkModal();
  }
}

customElements.define('html-editor', HtmlEditor);
