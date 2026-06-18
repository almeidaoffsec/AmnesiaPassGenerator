document.addEventListener('DOMContentLoaded', () => {
    const keywordInput = document.getElementById('keyword');
    const serviceInput = document.getElementById('service');
    const numCharsInput = document.getElementById('numChars');
    const iterationsInput = document.getElementById('iterations');
    const prefixInput = document.getElementById('prefix');
    const suffixInput = document.getElementById('suffix');
    const algorithmSelect = document.getElementById('algorithm');
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
        const algorithm = algorithmSelect.value;

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

        if (algorithm === 'MD5') {
            console.warn('MD5 não é recomendado; prefira SHA256 ou SHA512.');
        }

        for (let i = 0; i < iterations; i++) {
            let hashObject;
            switch (algorithm) {
                case 'MD5':
                    hashObject = CryptoJS.MD5(currentHash);
                    break;
                case 'SHA256':
                    hashObject = CryptoJS.SHA256(currentHash);
                    break;
                case 'SHA512':
                    hashObject = CryptoJS.SHA512(currentHash);
                    break;
                default:
                    alert('Algoritmo inválido. Use MD5, SHA256 ou SHA512.');
                    return;
            }
            currentHash = hashObject.toString(CryptoJS.enc.Hex);
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
});

if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js');
    });
}
