

const TRANSLATIONS = {
  he: {
    editCode: 'ערוך קוד',
    editVisual: 'ערוך טקסט',
    editSourceTitle: 'עריכת קוד מקור (HTML)',
    save: 'שמירה',
    cancel: 'ביטול',
    saving: 'שומר...',
    autosaving: 'שומר אוטומטית...',
    savedAt: 'נשמר בהצלחה ב-',
    autosavedAt: 'נשמר אוטומטית ב-',
    saveError: 'שגיאה בשמירה!',
    saveSuccessToast: 'השינויים נשמרו בהצלחה!',
    saveErrorToast: 'שגיאה בשמירה! ',
    modalTitle: 'הוספת / עריכת קישור',
    modalUrl: 'כתובת הקישור (URL):',
    modalText: 'טקסט להצגה:',
    modalSave: 'שמור'
  },
  en: {
    editCode: 'HTML Code',
    editVisual: 'Visual View',
    editSourceTitle: 'Edit source code (HTML)',
    save: 'Save',
    cancel: 'Cancel',
    saving: 'Saving...',
    autosaving: 'Autosaving...',
    savedAt: 'Saved successfully at ',
    autosavedAt: 'Autosaved at ',
    saveError: 'Save error!',
    saveSuccessToast: 'Changes saved successfully!',
    saveErrorToast: 'Save error! ',
    modalTitle: 'Insert / Edit Link',
    modalUrl: 'Link Address (URL):',
    modalText: 'Text to display:',
    modalSave: 'Save'
  }
};

class HtmlEditor extends HTMLElement {
  static get observedAttributes() {
    return ['content', 'dir', 'name', 'lang'];
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
    this.direction = this.getAttribute('dir') || 'ltr';
    this.resolvedLang = this.getAttribute('lang') || (this.direction === 'rtl' ? 'he' : 'en');
    this.t = TRANSLATIONS[this.resolvedLang] || TRANSLATIONS['en'];
    this.render();
    this.initElements();
    this.addEventListeners();
    this.updateDirectionUI();
    this.updateToolbarState();

    // Prevent accidental page close/unload with unsaved changes
    this.beforeUnloadHandler = (e) => {
      if (this.isCodeMode && this.codeEditor) {
        this.content = this.codeEditor.value;
      } else if (this.visualEditor) {
        this.content = this.visualEditor.innerHTML;
      }
      if (this.content !== this.lastSavedContent) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', this.beforeUnloadHandler);
    this.startAutosaveTimer();
  }

  disconnectedCallback() {
    this.stopAutosaveTimer();
    if (this.beforeUnloadHandler) {
      window.removeEventListener('beforeunload', this.beforeUnloadHandler);
    }
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue === newValue) return;

    if (name === 'content') {
      this.content = newValue || '';
      if (!this.isCodeMode && this.visualEditor) {
        if (document.activeElement !== this.visualEditor) {
          const trimmed = (this.content || '').trim();
          const targetHTML = (trimmed === '' || trimmed === '<br>') ? '<p><br></p>' : this.content;
          if (this.visualEditor.innerHTML !== targetHTML) {
            this.visualEditor.innerHTML = targetHTML;
          }
        }
      } else if (this.codeEditor) {
        this.codeEditor.value = this.content;
      }
    } else if (name === 'dir' || name === 'lang') {
      if (name === 'dir') {
        this.direction = newValue || 'ltr';
        this.updateDirectionUI();
      }
      this.resolvedLang = this.getAttribute('lang') || (this.direction === 'rtl' ? 'he' : 'en');
      this.t = TRANSLATIONS[this.resolvedLang] || TRANSLATIONS['en'];
      this.updateLocalizedTexts();
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
            <button type="button" class="btn btn-sm btn-default btn-align-right" title="Align Right"><i class="fa fa-align-right"></i></button>
            <button type="button" class="btn btn-sm btn-default btn-align-center" title="Align Center"><i class="fa fa-align-center"></i></button>
            <button type="button" class="btn btn-sm btn-default btn-align-left" title="Align Left"><i class="fa fa-align-left"></i></button>
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
          <div class="code-mode-title" style="display: none; font-weight: bold; padding: 0 8px; color: #6c757d;">${this.t.editSourceTitle}</div>
          
          <!-- Left side: Save, Cancel & Toggle actions -->
          <div style="display: flex; gap: 4px; align-items: center;">
            <span class="save-status" style="font-size: 0.85em; color: #6c757d; margin: 0 8px; transition: opacity 0.3s; opacity: 0; pointer-events: none;"></span>
            <button type="button" class="btn btn-sm btn-success btn-save" style="font-weight: bold;">
              <i class="fa fa-save" style="margin-inline-end: 4px;"></i>${this.t.save}
            </button>
            ${cancelUrl ? `
            <a href="${cancelUrl}" class="btn btn-sm btn-default btn-cancel" style="border: 1px solid #ccc; text-decoration: none;">
              <i class="fa fa-times" style="margin-inline-end: 4px; color: #d9534f;"></i>${this.t.cancel}
            </a>
            ` : ''}
            <button type="button" class="btn btn-sm btn-primary btn-toggle">
              <i class="fa fa-code btn-toggle-icon" style="margin-inline-end: 4px;"></i>
              <span class="btn-toggle-text">${this.t.editCode}</span>
            </button>
          </div>
        </div>

        <!-- Visual Editor -->
        <div class="form-group visual-editor-wrapper">
          <div class="editor-content form-control visual-editor" contenteditable="true" style="border: 1px solid #ced4da; border-radius: 0.25rem; padding: 12px; background-color: #fff; height: 400px; overflow-y: auto; font-weight: normal; font-style: normal; text-decoration: none;"></div>
        </div>

        <!-- HTML Code Editor -->
        <div class="form-group code-editor-wrapper" style="display: none;">
          <textarea class="form-control code-editor" rows="12" style="direction: ltr; font-family: monospace; height: 400px; overflow-y: auto; resize: vertical;"></textarea>
        </div>

        <!-- Custom Link Modal -->
        <div class="link-modal" style="display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0, 0, 0, 0.4); z-index: 10000; justify-content: center; align-items: center; backdrop-filter: blur(2px);">
          <div class="link-modal-content" style="background: white; border-radius: 8px; padding: 20px; width: 90%; max-width: 400px; box-shadow: 0 4px 15px rgba(0,0,0,0.2); direction: ${this.direction === 'rtl' ? 'rtl' : 'ltr'}; text-align: ${this.direction === 'rtl' ? 'right' : 'left'}; font-family: sans-serif; border: 1px solid #ddd;">
            <h4 style="margin-top: 0; margin-bottom: 15px; font-weight: bold; color: #333; border-bottom: 1px solid #eee; padding-bottom: 10px;">${this.t.modalTitle}</h4>
            <div class="form-group mb-3">
              <label style="display: block; margin-bottom: 5px; font-weight: 500; font-size: 13px; color: #555;">${this.t.modalUrl}</label>
              <input type="text" class="link-url-input form-control" placeholder="https://example.com" style="width: 100%; direction: ltr; text-align: left;">
            </div>
            <div class="form-group mb-3 link-text-group">
              <label style="display: block; margin-bottom: 5px; font-weight: 500; font-size: 13px; color: #555;">${this.t.modalText}</label>
              <input type="text" class="link-text-input form-control" style="width: 100%;">
            </div>
            <div style="display: flex; justify-content: flex-end; gap: 8px; margin-top: 20px;">
              <button type="button" class="btn btn-default btn-sm link-cancel-btn">${this.t.cancel}</button>
              <button type="button" class="btn btn-primary btn-sm link-save-btn">${this.t.modalSave}</button>
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
    this.btnAlignRight = this.querySelector('.btn-align-right');
    this.btnAlignCenter = this.querySelector('.btn-align-center');
    this.btnAlignLeft = this.querySelector('.btn-align-left');
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

    const trimmed = (this.content || '').trim();
    this.visualEditor.innerHTML = (trimmed === '' || trimmed === '<br>') ? '<p><br></p>' : this.content;
    this.codeEditor.value = this.formatHTML(this.visualEditor.innerHTML);
    this.lastSavedContent = this.visualEditor.innerHTML;
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
    this.btnAlignRight.addEventListener('click', () => exec('justifyRight'));
    this.btnAlignCenter.addEventListener('click', () => exec('justifyCenter'));
    this.btnAlignLeft.addEventListener('click', () => exec('justifyLeft'));
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
      this.saveInBackground(false);
    });

    this.visualEditor.addEventListener('input', () => this.updateContentFromVisual());
    this.visualEditor.addEventListener('keydown', (e) => {
      try {
        document.execCommand('defaultParagraphSeparator', false, 'p');
      } catch (err) {}
    });
    this.visualEditor.addEventListener('keyup', () => this.updateToolbarState());
    this.visualEditor.addEventListener('mouseup', () => this.updateToolbarState());
    this.visualEditor.addEventListener('click', () => {
      try {
        document.execCommand('defaultParagraphSeparator', false, 'p');
      } catch (err) {}
      this.updateToolbarState();
    });
    this.visualEditor.addEventListener('focus', () => {
      try {
        document.execCommand('defaultParagraphSeparator', false, 'p');
      } catch (err) {}
      this.updateToolbarState();
    });
    
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
      this.normalizeDivsToParagraphs();
      this.codeEditor.value = this.formatHTML(this.content);
      this.visualWrapper.style.display = 'none';
      this.codeWrapper.style.display = 'block';
      this.toolbarFormatting.style.display = 'none';
      this.codeModeTitle.style.display = 'inline-block';
      this.btnToggleIcon.className = 'fa fa-eye btn-toggle-icon';
      this.btnToggleText.textContent = this.t.editVisual;
    } else {
      this.content = this.codeEditor.value;
      this.visualEditor.innerHTML = this.content;
      this.visualWrapper.style.display = 'block';
      this.codeWrapper.style.display = 'none';
      this.toolbarFormatting.style.display = 'flex';
      this.codeModeTitle.style.display = 'none';
      this.btnToggleIcon.className = 'fa fa-code btn-toggle-icon';
      this.btnToggleText.textContent = this.t.editCode;
      setTimeout(() => this.updateToolbarState());
    }
  }

  updateContentFromVisual() {
    const trimmed = this.visualEditor.innerHTML.trim();
    if (trimmed === '' || trimmed === '<br>') {
      this.visualEditor.innerHTML = '<p><br></p>';
    }
    this.normalizeParagraphsIndentationLocal();
    this.content = this.visualEditor.innerHTML;
    this.dispatchEvent(new CustomEvent('contentchange', { detail: this.content }));
  }

  normalizeDivsToParagraphs() {
    if (!this.visualEditor) return;
    let changed = false;
    const divs = Array.from(this.visualEditor.querySelectorAll('div'));
    divs.forEach(div => {
      let parent = div.parentNode;
      while (parent && parent !== this.visualEditor) {
        parent = parent.parentNode;
      }
      if (parent !== this.visualEditor) return;

      const p = document.createElement('p');
      for (let i = 0; i < div.attributes.length; i++) {
        const attr = div.attributes[i];
        p.setAttribute(attr.name, attr.value);
      }
      while (div.firstChild) {
        p.appendChild(div.firstChild);
      }
      div.parentNode.replaceChild(p, div);
      changed = true;
    });
    
    const indentChanged = this.normalizeParagraphsIndentation();
    if (changed || indentChanged) {
      this.content = this.visualEditor.innerHTML;
    }
  }

  getCurrentParagraph() {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return null;
    let node = selection.getRangeAt(0).startContainer;
    while (node && node !== this.visualEditor) {
      if (node.nodeName === 'P') {
        return node;
      }
      node = node.parentNode;
    }
    return null;
  }

  isParagraphBlank(p) {
    if (!p) return false;
    const text = p.textContent.replace(/[\s\u200B\u00A0]/g, '');
    const inner = p.innerHTML.trim();
    return text === '' && (inner === '' || inner === '<br>' || inner === '<br/>' || inner === '&nbsp;');
  }

  normalizeParagraphsIndentationLocal() {
    const p = this.getCurrentParagraph();
    if (!p) return;

    const setIndentZero = (el, shouldHave) => {
      const styleAttr = el.getAttribute('style') || '';
      const hasIndentZero = /text-indent\s*:\s*0/i.test(styleAttr);
      if (shouldHave) {
        if (!hasIndentZero) {
          let newStyle = styleAttr.trim();
          if (newStyle && !newStyle.endsWith(';')) newStyle += ';';
          newStyle = (newStyle + ' text-indent: 0;').trim();
          el.setAttribute('style', newStyle);
        }
      } else {
        if (hasIndentZero) {
          let newStyle = styleAttr.replace(/text-indent\s*:\s*0\s*;?/gi, '').trim();
          if (newStyle === '') {
            el.removeAttribute('style');
          } else {
            el.setAttribute('style', newStyle);
          }
        }
      }
    };

    const isCurrentBlank = this.isParagraphBlank(p);
    const prev = p.previousElementSibling;
    const next = p.nextElementSibling;

    // 1. Update current paragraph
    if (isCurrentBlank) {
      setIndentZero(p, false);
    } else {
      const isPrevBlank = prev && prev.nodeName === 'P' && this.isParagraphBlank(prev);
      setIndentZero(p, isPrevBlank);
    }

    // 2. Update next paragraph
    if (next && next.nodeName === 'P' && !this.isParagraphBlank(next)) {
      setIndentZero(next, isCurrentBlank);
    }
  }

  normalizeParagraphsIndentation() {
    if (!this.visualEditor) return false;
    
    let changed = false;
    const paragraphs = Array.from(this.visualEditor.querySelectorAll('p'));
    let lastWasBlank = false;
    
    paragraphs.forEach((p) => {
      const isBlank = this.isParagraphBlank(p);
      
      if (isBlank) {
        lastWasBlank = true;
      } else {
        const styleAttr = p.getAttribute('style') || '';
        const hasIndentZero = /text-indent\s*:\s*0/i.test(styleAttr);
        
        if (lastWasBlank) {
          if (!hasIndentZero) {
            let newStyle = styleAttr.trim();
            if (newStyle && !newStyle.endsWith(';')) newStyle += ';';
            newStyle = (newStyle + ' text-indent: 0;').trim();
            p.setAttribute('style', newStyle);
            changed = true;
          }
        } else {
          if (hasIndentZero) {
            let newStyle = styleAttr
              .replace(/text-indent\s*:\s*0\s*;?/gi, '')
              .trim();
            if (newStyle === '') {
              p.removeAttribute('style');
            } else {
              p.setAttribute('style', newStyle);
            }
            changed = true;
          }
        }
        lastWasBlank = false;
      }
    });
    
    return changed;
  }

  formatHTML(html) {
    if (!html) return '';
    let formatted = html;
    
    // Add newline after closing tags and self-closing tags
    formatted = formatted.replace(/(<\/(p|div|h1|h2|h3|h4|h5|h6|ul|ol|li|section|article|form|table|tr|thead|tbody)>)/gi, '$1\n');
    formatted = formatted.replace(/(<br\s*\/?>)/gi, '$1\n');
    
    // Add newline before opening tags if there isn't one already
    formatted = formatted.replace(/([^\n])(<(p|div|h1|h2|h3|h4|h5|h6|ul|ol|li|section|article|form|table|tr|thead|tbody)(?:\s+[^>]*)?>)/gi, '$1\n$2');
    
    // Trim extra spaces from lines and join
    return formatted.split('\n').map(line => line.trim()).filter(line => line !== '').join('\n');
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

  updateLocalizedTexts() {
    if (!this.t) return;
    
    // Update code mode title
    if (this.codeModeTitle) {
      this.codeModeTitle.textContent = this.t.editSourceTitle;
    }
    
    // Update Save button text
    const btnSave = this.querySelector('.btn-save');
    if (btnSave) {
      btnSave.innerHTML = `<i class="fa fa-save" style="margin-inline-end: 4px;"></i>${this.t.save}`;
    }
    
    // Update Cancel button text
    const btnCancel = this.querySelector('.btn-cancel');
    if (btnCancel) {
      btnCancel.innerHTML = `<i class="fa fa-times" style="margin-inline-end: 4px; color: #d9534f;"></i>${this.t.cancel}`;
    }
    
    // Update Toggle button text
    if (this.btnToggleText) {
      this.btnToggleText.textContent = this.isCodeMode ? this.t.editVisual : this.t.editCode;
    }
    
    // Update Link Modal texts if present
    const modalTitle = this.querySelector('.link-modal h4');
    if (modalTitle) {
      modalTitle.textContent = this.t.modalTitle;
    }
    const modalUrlLabel = this.querySelector('.link-modal .form-group:nth-child(2) label');
    if (modalUrlLabel) {
      modalUrlLabel.textContent = this.t.modalUrl;
    }
    const modalTextLabel = this.querySelector('.link-modal .link-text-group label');
    if (modalTextLabel) {
      modalTextLabel.textContent = this.t.modalText;
    }
    const modalCancelBtn = this.querySelector('.link-modal .link-cancel-btn');
    if (modalCancelBtn) {
      modalCancelBtn.textContent = this.t.cancel;
    }
    const modalSaveBtn = this.querySelector('.link-modal .link-save-btn');
    if (modalSaveBtn) {
      modalSaveBtn.textContent = this.t.modalSave;
    }
  }

  isSelectionInEditor() {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return false;
    try {
      let node = selection.getRangeAt(0).startContainer;
      while (node) {
        if (node === this.visualEditor) {
          return true;
        }
        node = node.parentNode;
      }
    } catch (e) {}
    return false;
  }

  updateToolbarState() {
    if (this.isCodeMode) return;
    
    const inEditor = this.isSelectionInEditor();

    const isBold = inEditor ? document.queryCommandState('bold') : false;
    const isItalic = inEditor ? document.queryCommandState('italic') : false;
    const isUnderline = inEditor ? document.queryCommandState('underline') : false;
    const isAlignRight = inEditor ? document.queryCommandState('justifyRight') : false;
    const isAlignCenter = inEditor ? document.queryCommandState('justifyCenter') : false;
    const isAlignLeft = inEditor ? document.queryCommandState('justifyLeft') : false;
    const isUl = inEditor ? document.queryCommandState('insertUnorderedList') : false;
    const isOl = inEditor ? document.queryCommandState('insertOrderedList') : false;

    let formatBlock = '';
    if (inEditor) {
      let format = '';
      try {
        format = document.queryCommandValue('formatBlock');
      } catch (e) {}
      formatBlock = format ? format.toLowerCase().replace(/[<>]/g, '').trim() : '';
    }

    this.toggleButtonActive(this.btnBold, isBold);
    this.toggleButtonActive(this.btnItalic, isItalic);
    this.toggleButtonActive(this.btnUnderline, isUnderline);
    this.toggleButtonActive(this.btnAlignRight, isAlignRight);
    this.toggleButtonActive(this.btnAlignCenter, isAlignCenter);
    this.toggleButtonActive(this.btnAlignLeft, isAlignLeft);
    this.toggleButtonActive(this.btnUl, isUl);
    this.toggleButtonActive(this.btnOl, isOl);

    this.toggleButtonActive(this.btnH1, formatBlock === 'h1');
    this.toggleButtonActive(this.btnH2, formatBlock === 'h2');
    this.toggleButtonActive(this.btnH3, formatBlock === 'h3');
    this.toggleButtonActive(this.btnP, ['p', 'normal', 'div'].includes(formatBlock));

    const dir = this.direction || 'ltr';
    this.toggleButtonActive(this.btnLtr, dir === 'ltr');
    this.toggleButtonActive(this.btnRtl, dir === 'rtl');

    const hasLink = inEditor && this.getClosestAnchor() !== null;
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
        this.normalizeDivsToParagraphs();
        this.triggerSave();
      }
    }, 150);
  }

  startAutosaveTimer() {
    this.stopAutosaveTimer();
    console.log('[HtmlEditor] Autosave timer started. Interval: 30 seconds.');
    this.autosaveInterval = setInterval(() => {
      this.checkAndAutosave();
    }, 30000); // 30 seconds
  }

  stopAutosaveTimer() {
    if (this.autosaveInterval) {
      clearInterval(this.autosaveInterval);
      this.autosaveInterval = null;
    }
  }

  async checkAndAutosave() {
    console.log('[HtmlEditor] Autosave timer triggered.');
    
    // Check if the parent form is valid before autosaving (especially for new pages)
    const parentForm = this.closest('form');
    if (parentForm && !parentForm.checkValidity()) {
      console.log('[HtmlEditor] Form is invalid (e.g. missing required fields like title or slug). Autosave skipped.');
      return;
    }

    if (this.isCodeMode && this.codeEditor) {
      this.content = this.codeEditor.value;
    } else if (this.visualEditor) {
      this.content = this.visualEditor.innerHTML;
    }

    if (this.content !== this.lastSavedContent) {
      console.log('[HtmlEditor] Changes detected (content is dirty). Saving in background...');
      await this.saveInBackground(true);
    } else {
      console.log('[HtmlEditor] No changes detected.');
    }
  }

  async saveInBackground(isAutosave = false) {
    const parentForm = this.closest('form');
    if (!parentForm) {
      console.error('[HtmlEditor] Cannot save: parent form not found.');
      return;
    }

    // Check validity on manual save too
    if (!isAutosave && !parentForm.checkValidity()) {
      parentForm.reportValidity();
      return;
    }

    if (!this.isCodeMode) {
      this.normalizeDivsToParagraphs();
      this.content = this.visualEditor.innerHTML;
    } else {
      this.content = this.codeEditor.value;
    }

    if (this.hiddenInput) {
      this.hiddenInput.value = this.content;
    }

    const statusEl = this.querySelector('.save-status');
    if (statusEl) {
      statusEl.style.color = '#0275d8';
      statusEl.style.opacity = '1';
      statusEl.textContent = isAutosave ? this.t.autosaving : this.t.saving;
    }

    const url = parentForm.getAttribute('action') || window.location.href;
    const method = (parentForm.getAttribute('method') || 'POST').toUpperCase();
    const isNew = url.includes('/new') || url.includes('/create') || window.location.pathname.includes('/new') || window.location.pathname.includes('/create');
    
    // Create FormData from parent form
    const formData = new FormData(parentForm);

    console.log(`[HtmlEditor] Sending save request to ${url} (method: ${method})...`);

    try {
      const response = await fetch(url, {
        method: method,
        body: formData
      });

      if (response.ok) {
        this.lastSavedContent = this.content;
        console.log('[HtmlEditor] Save successful.');

        if (isNew && response.redirected) {
          console.log(`[HtmlEditor] Redirecting to new page: ${response.url}`);
          window.location.href = response.url;
          return;
        }

        if (!isAutosave) {
          this.showToast(this.t.saveSuccessToast, 'success');
        }

        if (statusEl) {
          statusEl.style.color = '#5cb85c';
          statusEl.style.opacity = '1';
          const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
          statusEl.textContent = isAutosave ? `${this.t.autosavedAt}${now}` : `${this.t.savedAt}${now}`;
          setTimeout(() => {
            if (this.content === this.lastSavedContent && statusEl.textContent.includes(now)) {
              statusEl.style.opacity = '0';
            }
          }, 5000);
        }
        this.dispatchEvent(new CustomEvent('save-success', { detail: { content: this.content, isAutosave } }));
      } else {
        const text = await response.text();
        console.error('[HtmlEditor] Server returned error response:', response.status, text);
        throw new Error(`Server returned status ${response.status}`);
      }
    } catch (e) {
      console.error('[HtmlEditor] Save request failed:', e);
      if (statusEl) {
        statusEl.style.color = '#d9534f';
        statusEl.style.opacity = '1';
        statusEl.textContent = this.t.saveError;
      }
      this.showToast(this.t.saveErrorToast + e.message, 'error');
      this.dispatchEvent(new CustomEvent('save-error', { detail: { error: e.message, isAutosave } }));
    }
  }

  showToast(message, type = 'success') {
    let container = document.getElementById('html-editor-toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'html-editor-toast-container';
      container.style.cssText = 'position: fixed; bottom: 20px; right: 20px; z-index: 9999; display: flex; flex-direction: column; gap: 10px; pointer-events: none;';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.style.cssText = `
      padding: 12px 24px;
      border-radius: 4px;
      color: #fff;
      font-weight: bold;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      opacity: 0;
      transform: translateY(20px);
      transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
      direction: rtl;
      font-family: sans-serif;
      pointer-events: auto;
    `;

    if (type === 'success') {
      toast.style.backgroundColor = '#5cb85c';
    } else if (type === 'error') {
      toast.style.backgroundColor = '#d9534f';
    } else {
      toast.style.backgroundColor = '#0275d8';
    }

    toast.textContent = message;
    container.appendChild(toast);

    toast.offsetHeight; // trigger reflow
    toast.style.opacity = '1';
    toast.style.transform = 'translateY(0)';

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(20px)';
      setTimeout(() => {
        toast.remove();
        if (container.children.length === 0) {
          container.remove();
        }
      }, 300);
    }, 4000);
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
