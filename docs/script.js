// --- Utilitários de codificação ---

function b64Encode(buf) {
    return btoa(String.fromCharCode(...new Uint8Array(buf)));
}

function b64Decode(str) {
    return Uint8Array.from(atob(str), c => c.charCodeAt(0));
}

// --- Web Crypto: derivação de chave e AES-GCM-256 ---

async function deriveKey(passkey, salt) {
    const enc = new TextEncoder();
    const raw = await crypto.subtle.importKey(
        'raw', enc.encode(passkey), 'PBKDF2', false, ['deriveKey']
    );
    return crypto.subtle.deriveKey(
        { name: 'PBKDF2', salt, iterations: 200000, hash: 'SHA-256' },
        raw,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt', 'decrypt']
    );
}

async function encryptProfileData(passkey, dataObj) {
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const iv   = crypto.getRandomValues(new Uint8Array(12));
    const key  = await deriveKey(passkey, salt);
    const ct   = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        key,
        new TextEncoder().encode(JSON.stringify(dataObj))
    );
    return { v: 1, salt: b64Encode(salt), iv: b64Encode(iv), ct: b64Encode(ct) };
}

async function decryptProfileData(passkey, { salt, iv, ct }) {
    const key   = await deriveKey(passkey, b64Decode(salt));
    const plain = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: b64Decode(iv) },
        key,
        b64Decode(ct)
    );
    return JSON.parse(new TextDecoder().decode(plain));
}

// --- Armazenamento de perfis ---

const PROFILES_KEY = 'apg_profiles';

function getAllProfiles() {
    try { return JSON.parse(localStorage.getItem(PROFILES_KEY) || '{}'); }
    catch { return {}; }
}

function persistProfiles(profiles) {
    localStorage.setItem(PROFILES_KEY, JSON.stringify(profiles));
}

// ---

document.addEventListener('DOMContentLoaded', () => {
    const keywordInput = document.getElementById('keyword');
    const serviceInput = document.getElementById('service');
    const numCharsInput = document.getElementById('numChars');
    const iterationsInput = document.getElementById('iterations');
    const prefixInput = document.getElementById('prefix');
    const suffixInput = document.getElementById('suffix');
    const generateBtn = document.getElementById('generateBtn');
    const resultInput = document.getElementById('result');
    const resultLengthHint = document.getElementById('resultLengthHint');
    const copyResultBtn = document.getElementById('copyResultBtn');
    const toggleButtons = document.querySelectorAll('.toggle-btn');

    const eyeIcon = `
        <svg class="toggle-icon" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7Z"></path>
            <circle cx="12" cy="12" r="3"></circle>
        </svg>
    `;
    const eyeSlashIcon = `
        <svg class="toggle-icon" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M3 3l18 18"></path>
            <path d="M10.5 10.5a3 3 0 0 0 4.2 4.2"></path>
            <path d="M9.9 5.2A10.4 10.4 0 0 1 12 5c6 0 10 7 10 7a17.5 17.5 0 0 1-4.1 4.6"></path>
            <path d="M6.1 6.1A17.5 17.5 0 0 0 2 12s4 7 10 7a10.4 10.4 0 0 0 4.2-.9"></path>
        </svg>
    `;

    generateBtn.addEventListener('click', generatePassword);
    if (copyResultBtn) {
        copyResultBtn.addEventListener('click', copyResultToClipboard);
    }
    toggleButtons.forEach((button) => {
        button.innerHTML = eyeSlashIcon;
        button.addEventListener('click', () => toggleVisibility(button));
    });

    function generatePassword() {
        const keyword = keywordInput.value;
        const service = serviceInput.value;
        let numChars = parseInt(numCharsInput.value);
        let iterations = parseInt(iterationsInput.value);
        const prefix = prefixInput.value || '';
        const suffix = suffixInput.value || '';
        // Validação básica
        if (!keyword) {
            alert('Por favor, insira uma palavra-chave.');
            return;
        }

        // Aplicar defaults
        if (isNaN(iterations) || iterations < 1) {
            iterations = 1;
            iterationsInput.value = 1; // Atualiza o campo se o usuário deixou inválido
        }
        // numChars pode ser NaN se não for informado, o que é tratado como "hash completo"

        let currentHash = keyword;

        if (service) {
            currentHash = `${currentHash}:${service}`;
        }

        for (let i = 0; i < iterations; i++) {
            currentHash = CryptoJS.SHA512(currentHash).toString(CryptoJS.enc.Hex);
        }

        // Cortar o resultado final APENAS se numChars foi especificado e é um número válido
        let finalResult = currentHash;
        if (!isNaN(numChars) && numChars > 0) {
            finalResult = currentHash.substring(0, numChars);
        }

        resultInput.value = `${prefix}${finalResult}${suffix}`;
        updateResultLengthHint();
    }

    async function copyResultToClipboard() {
        const value = resultInput.value;
        if (!value) {
            alert('Gere uma senha antes de copiar.');
            return;
        }

        try {
            if (navigator.clipboard && window.isSecureContext) {
                await navigator.clipboard.writeText(value);
            } else {
                legacyCopy(value);
            }
            showCopyFeedback();
        } catch (err) {
            try {
                legacyCopy(value);
                showCopyFeedback();
            } catch (fallbackErr) {
                alert('Não foi possível copiar. Copie manualmente.');
            }
        }
    }

    function legacyCopy(value) {
        const textarea = document.createElement('textarea');
        textarea.value = value;
        textarea.setAttribute('readonly', '');
        textarea.style.position = 'fixed';
        textarea.style.top = '0';
        textarea.style.left = '0';
        textarea.style.opacity = '0';
        textarea.style.pointerEvents = 'none';
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        textarea.setSelectionRange(0, textarea.value.length);
        const successful = document.execCommand('copy');
        document.body.removeChild(textarea);
        if (!successful) {
            throw new Error('copy failed');
        }
    }

    function showCopyFeedback() {
        if (!copyResultBtn) {
            return;
        }
        const originalText = copyResultBtn.textContent;
        copyResultBtn.textContent = 'Copiado!';
        copyResultBtn.disabled = true;
        setTimeout(() => {
            copyResultBtn.textContent = originalText;
            copyResultBtn.disabled = false;
        }, 1200);
    }

    function toggleVisibility(button) {
        const targetId = button.getAttribute('data-target');
        const target = document.getElementById(targetId);
        if (!target) {
            return;
        }
        const isHidden = target.getAttribute('type') === 'password';
        target.setAttribute('type', isHidden ? 'text' : 'password');
        button.innerHTML = isHidden ? eyeIcon : eyeSlashIcon;
        if (targetId === 'result') {
            updateResultLengthHint();
        }
    }

    function updateResultLengthHint() {
        if (!resultLengthHint) {
            return;
        }
        const isResultVisible = resultInput.getAttribute('type') === 'text';
        if (isResultVisible && resultInput.value) {
            resultLengthHint.textContent = `Total de caracteres: ${resultInput.value.length}`;
            resultLengthHint.style.display = 'block';
            return;
        }
        resultLengthHint.textContent = '';
        resultLengthHint.style.display = 'none';
    }

    // --- Perfis salvos ---

    const profileSelect        = document.getElementById('profileSelect');
    const loadProfileBtn       = document.getElementById('loadProfileBtn');
    const deleteProfileBtn     = document.getElementById('deleteProfileBtn');
    const saveProfileBtn       = document.getElementById('saveProfileBtn');
    const exportProfilesBtn    = document.getElementById('exportProfilesBtn');
    const importProfilesBtn    = document.getElementById('importProfilesBtn');
    const importFileInput      = document.getElementById('importFileInput');
    const importStatus         = document.getElementById('importStatus');

    const saveProfileDialog    = document.getElementById('saveProfileDialog');
    const profileNameInput     = document.getElementById('profileNameInput');
    const saveProfileError     = document.getElementById('saveProfileError');
    const confirmSaveProfileBtn = document.getElementById('confirmSaveProfileBtn');
    const cancelSaveProfileBtn  = document.getElementById('cancelSaveProfileBtn');

    const loadProfileDialog    = document.getElementById('loadProfileDialog');
    const decryptKeyInput      = document.getElementById('decryptKeyInput');
    const loadProfileError     = document.getElementById('loadProfileError');
    const confirmLoadProfileBtn = document.getElementById('confirmLoadProfileBtn');
    const cancelLoadProfileBtn  = document.getElementById('cancelLoadProfileBtn');

    function renderProfileDropdown() {
        const profiles = getAllProfiles();
        const names = Object.keys(profiles).sort();
        const previous = profileSelect.value;
        profileSelect.innerHTML = '<option value="">— Selecione um perfil —</option>';
        names.forEach(name => {
            const opt = document.createElement('option');
            opt.value = name;
            opt.textContent = name;
            profileSelect.appendChild(opt);
        });
        if (previous && profiles[previous]) {
            profileSelect.value = previous;
        }
        syncProfileButtons();
    }

    function syncProfileButtons() {
        const selected = profileSelect.value !== '';
        const hasProfiles = Object.keys(getAllProfiles()).length > 0;
        loadProfileBtn.disabled = !selected;
        deleteProfileBtn.disabled = !selected;
        exportProfilesBtn.disabled = !hasProfiles;
    }

    function resetLoadModal() {
        decryptKeyInput.value = '';
        decryptKeyInput.setAttribute('type', 'password');
        const toggle = loadProfileDialog.querySelector('.toggle-btn');
        if (toggle) toggle.innerHTML = eyeSlashIcon;
        loadProfileError.textContent = '';
    }

    profileSelect.addEventListener('change', syncProfileButtons);

    // Salvar: abre modal de nome
    saveProfileBtn.addEventListener('click', () => {
        saveProfileError.textContent = '';
        profileNameInput.value = '';
        if (!keywordInput.value) {
            saveProfileError.textContent = 'Preencha a Palavra-Chave antes de salvar o perfil.';
        }
        saveProfileDialog.showModal();
        if (keywordInput.value) profileNameInput.focus();
    });

    cancelSaveProfileBtn.addEventListener('click', () => saveProfileDialog.close());
    saveProfileDialog.addEventListener('click', e => {
        if (e.target === saveProfileDialog) saveProfileDialog.close();
    });
    profileNameInput.addEventListener('keydown', e => {
        if (e.key === 'Enter') confirmSaveProfileBtn.click();
    });

    confirmSaveProfileBtn.addEventListener('click', async () => {
        const name = profileNameInput.value.trim();
        if (!name) {
            saveProfileError.textContent = 'Insira um nome para o perfil.';
            return;
        }
        if (!keywordInput.value) {
            saveProfileError.textContent = 'Preencha a Palavra-Chave antes de salvar o perfil.';
            return;
        }
        const profiles = getAllProfiles();
        if (profiles[name] && !confirm(`O perfil "${name}" já existe. Deseja sobrescrever?`)) {
            return;
        }
        const originalText = confirmSaveProfileBtn.textContent;
        confirmSaveProfileBtn.disabled = true;
        confirmSaveProfileBtn.textContent = 'Salvando…';
        try {
            const data = {
                keyword:    keywordInput.value,
                service:    serviceInput.value,
                numChars:   numCharsInput.value,
                iterations: iterationsInput.value,
                prefix:     prefixInput.value,
                suffix:     suffixInput.value,
            };
            const encrypted = await encryptProfileData(keywordInput.value, data);
            profiles[name] = encrypted;
            persistProfiles(profiles);
            renderProfileDropdown();
            profileSelect.value = name;
            syncProfileButtons();
            saveProfileDialog.close();
        } catch {
            saveProfileError.textContent = 'Erro ao criptografar. Tente novamente.';
        } finally {
            confirmSaveProfileBtn.disabled = false;
            confirmSaveProfileBtn.textContent = originalText;
        }
    });

    // Carregar: abre modal de passkey
    loadProfileBtn.addEventListener('click', () => {
        resetLoadModal();
        loadProfileDialog.showModal();
        decryptKeyInput.focus();
    });

    cancelLoadProfileBtn.addEventListener('click', () => loadProfileDialog.close());
    loadProfileDialog.addEventListener('click', e => {
        if (e.target === loadProfileDialog) loadProfileDialog.close();
    });
    decryptKeyInput.addEventListener('keydown', e => {
        if (e.key === 'Enter') confirmLoadProfileBtn.click();
    });

    confirmLoadProfileBtn.addEventListener('click', async () => {
        const passkey = decryptKeyInput.value;
        if (!passkey) {
            loadProfileError.textContent = 'Insira a Palavra-Chave.';
            return;
        }
        const name = profileSelect.value;
        const entry = getAllProfiles()[name];
        if (!entry) {
            loadProfileError.textContent = 'Perfil não encontrado.';
            return;
        }
        const originalText = confirmLoadProfileBtn.textContent;
        confirmLoadProfileBtn.disabled = true;
        confirmLoadProfileBtn.textContent = 'Descriptografando…';
        try {
            const data = await decryptProfileData(passkey, entry);
            keywordInput.value    = data.keyword    ?? '';
            serviceInput.value    = data.service    ?? '';
            numCharsInput.value   = data.numChars   ?? '';
            iterationsInput.value = data.iterations ?? '1';
            prefixInput.value     = data.prefix ?? '';
            suffixInput.value     = data.suffix ?? '';
            loadProfileDialog.close();
        } catch {
            loadProfileError.textContent = 'Palavra-chave incorreta ou perfil corrompido.';
        } finally {
            confirmLoadProfileBtn.disabled = false;
            confirmLoadProfileBtn.textContent = originalText;
        }
    });

    // Export
    exportProfilesBtn.addEventListener('click', () => {
        const profiles = getAllProfiles();
        const json = JSON.stringify(profiles, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `apg-profiles-${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
    });

    // Import
    importProfilesBtn.addEventListener('click', () => {
        importFileInput.value = '';
        importStatus.textContent = '';
        importFileInput.click();
    });

    importFileInput.addEventListener('change', () => {
        const file = importFileInput.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            let imported;
            try {
                imported = JSON.parse(e.target.result);
            } catch {
                importStatus.textContent = 'Arquivo inválido — JSON malformado.';
                return;
            }

            if (typeof imported !== 'object' || Array.isArray(imported) || imported === null) {
                importStatus.textContent = 'Arquivo inválido — estrutura inesperada.';
                return;
            }

            const valid = {};
            const skippedInvalid = [];
            for (const [name, entry] of Object.entries(imported)) {
                if (entry && typeof entry.salt === 'string' && typeof entry.iv === 'string' && typeof entry.ct === 'string') {
                    valid[name] = entry;
                } else {
                    skippedInvalid.push(name);
                }
            }

            if (Object.keys(valid).length === 0) {
                importStatus.textContent = 'Nenhum perfil válido encontrado no arquivo.';
                return;
            }

            const existing = getAllProfiles();
            const conflicts = Object.keys(valid).filter(n => existing[n]);
            let overwrite = false;
            if (conflicts.length > 0) {
                overwrite = confirm(
                    `${conflicts.length} perfil(s) já existem: ${conflicts.join(', ')}.\n\nDeseja sobrescrever?`
                );
            }

            let imported_count = 0;
            let skipped_count = 0;
            for (const [name, entry] of Object.entries(valid)) {
                if (existing[name] && !overwrite) {
                    skipped_count++;
                } else {
                    existing[name] = entry;
                    imported_count++;
                }
            }

            persistProfiles(existing);
            renderProfileDropdown();

            const parts = [`${imported_count} perfil(s) importado(s).`];
            if (skipped_count > 0) parts.push(`${skipped_count} ignorado(s) (já existiam).`);
            if (skippedInvalid.length > 0) parts.push(`${skippedInvalid.length} inválido(s) descartado(s).`);
            importStatus.textContent = parts.join(' ');
        };
        reader.readAsText(file);
    });

    // Excluir
    deleteProfileBtn.addEventListener('click', () => {
        const name = profileSelect.value;
        if (!name || !confirm(`Excluir o perfil "${name}"? Esta ação não pode ser desfeita.`)) return;
        const profiles = getAllProfiles();
        delete profiles[name];
        persistProfiles(profiles);
        renderProfileDropdown();
    });

    renderProfileDropdown();
});

if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js');
    });
}
