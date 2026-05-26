'use strict';

(function() {
  function getCopyText(codeText) {
    return codeText.replace(/^(GET|POST|PUT|PATCH|DELETE)\s+/i, '').trim();
  }

  async function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return;
    }

    var textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'absolute';
    textarea.style.left = '-9999px';
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
  }

  function addCopyButton(pre) {
    var code = pre.querySelector('code');
    if (!code) {
      return;
    }

    var container = pre.closest('.api-example') || pre.parentElement;
    if (!container) {
      return;
    }

    container.classList.add('copyable-example');

    var button = document.createElement('button');
    button.type = 'button';
    button.className = 'copy-code-button';
    button.setAttribute('aria-label', 'Kopioi API-osoite');
    button.innerHTML = '<span class="copy-icon" aria-hidden="true"></span><span class="copy-label">Kopioi</span>';

    button.addEventListener('click', async function() {
      var originalLabel = button.querySelector('.copy-label').textContent;
      var text = getCopyText(code.textContent);

      try {
        await copyText(text);
        button.querySelector('.copy-label').textContent = 'Kopioitu';
        button.classList.add('is-copied');
      } catch (error) {
        button.querySelector('.copy-label').textContent = 'Ei onnistunut';
        button.classList.add('is-error');
      }

      window.setTimeout(function() {
        button.querySelector('.copy-label').textContent = originalLabel;
        button.classList.remove('is-copied', 'is-error');
      }, 1600);
    });

    container.appendChild(button);
  }

  function addTableCopyButtons(table) {
    if (table.dataset.copyButtonsAdded === 'true') {
      return;
    }

    var headerRow = table.querySelector('thead tr');
    if (headerRow) {
      var heading = document.createElement('th');
      heading.className = 'api-table-copy-heading';
      heading.textContent = 'Kopioi';
      headerRow.appendChild(heading);
    }

    table.querySelectorAll('tbody tr').forEach(function(row) {
      var code = row.querySelector('code');
      if (!code) {
        return;
      }

      var cell = document.createElement('td');
      cell.className = 'api-table-copy-cell';

      var button = document.createElement('button');
      button.type = 'button';
      button.className = 'copy-code-button copy-id-button';
      button.setAttribute('aria-label', 'Kopioi ID');
      button.innerHTML = '<span class="copy-icon" aria-hidden="true"></span><span class="copy-label">Kopioi</span>';

      button.addEventListener('click', async function() {
        var originalLabel = button.querySelector('.copy-label').textContent;
        var text = code.textContent.trim();

        try {
          await copyText(text);
          button.querySelector('.copy-label').textContent = 'Kopioitu';
          button.classList.add('is-copied');
        } catch (error) {
          button.querySelector('.copy-label').textContent = 'Ei onnistunut';
          button.classList.add('is-error');
        }

        window.setTimeout(function() {
          button.querySelector('.copy-label').textContent = originalLabel;
          button.classList.remove('is-copied', 'is-error');
        }, 1600);
      });

      cell.appendChild(button);
      row.appendChild(cell);
    });

    table.dataset.copyButtonsAdded = 'true';
  }

  document.addEventListener('DOMContentLoaded', function() {
    document.querySelectorAll('.api-guide pre').forEach(addCopyButton);
    document.querySelectorAll('.api-table').forEach(addTableCopyButtons);
  });
})();
