'use strict';

(function () {
  const openDropdowns = new Set();

  document.addEventListener('click', function (event) {
    openDropdowns.forEach(function (instance) {
      if (!instance.root.contains(event.target)) {
        instance.close();
      }
    });
  });

  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape') {
      openDropdowns.forEach(function (instance) { instance.close(); });
    }
  });

  function createMultiDropdown(root, options) {
    options = options || {};
    const allLabel = options.allLabel || 'Kaikki';
    const itemLabel = options.itemLabel || 'valittu';

    let items = [];
    const selected = new Set();
    const listeners = [];

    root.classList.add('multi-dropdown');
    root.innerHTML = ''
      + '<button type="button" class="multi-dropdown__button">'
      +   '<span class="multi-dropdown__label"></span>'
      +   '<span class="multi-dropdown__caret" aria-hidden="true">▾</span>'
      + '</button>'
      + '<div class="multi-dropdown__panel" hidden>'
      +   '<div class="multi-dropdown__actions">'
      +     '<button type="button" class="multi-dropdown__action" data-action="all">Kaikki</button>'
      +     '<button type="button" class="multi-dropdown__action" data-action="clear">Tyhjennä</button>'
      +   '</div>'
      +   '<div class="multi-dropdown__list"></div>'
      + '</div>';

    const button = root.querySelector('.multi-dropdown__button');
    const labelEl = root.querySelector('.multi-dropdown__label');
    const panel = root.querySelector('.multi-dropdown__panel');
    const list = root.querySelector('.multi-dropdown__list');

    function updateLabel() {
      const values = Array.from(selected);
      if (values.length === 0) {
        labelEl.textContent = allLabel;
        labelEl.classList.add('multi-dropdown__label--placeholder');
        return;
      }
      labelEl.classList.remove('multi-dropdown__label--placeholder');

      if (values.length === 1) {
        const match = items.find(function (i) { return i.value === values[0]; });
        labelEl.textContent = match ? match.label : values[0];
        return;
      }

      if (values.length === items.length) {
        labelEl.textContent = allLabel;
        labelEl.classList.add('multi-dropdown__label--placeholder');
        return;
      }

      labelEl.textContent = values.length + ' ' + itemLabel;
    }

    function emitChange() {
      const values = Array.from(selected);
      listeners.forEach(function (fn) { fn(values); });
    }

    function renderList() {
      list.innerHTML = '';
      items.forEach(function (item) {
        const id = root.id + '-opt-' + item.value;
        const row = document.createElement('label');
        row.className = 'multi-dropdown__row';
        row.setAttribute('for', id);

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.id = id;
        checkbox.value = item.value;
        checkbox.checked = selected.has(item.value);
        checkbox.addEventListener('change', function () {
          if (checkbox.checked) {
            selected.add(item.value);
          } else {
            selected.delete(item.value);
          }
          updateLabel();
          emitChange();
        });

        const text = document.createElement('span');
        text.textContent = item.label;

        row.appendChild(checkbox);
        row.appendChild(text);
        list.appendChild(row);
      });
    }

    function setItems(newItems) {
      items = (newItems || []).map(function (i) { return { value: i.value, label: i.label }; });
      const valid = new Set(items.map(function (i) { return i.value; }));
      Array.from(selected).forEach(function (v) {
        if (!valid.has(v)) selected.delete(v);
      });
      renderList();
      updateLabel();
    }

    function getSelected() {
      return Array.from(selected);
    }

    function setSelected(values) {
      selected.clear();
      (values || []).forEach(function (v) { selected.add(v); });
      renderList();
      updateLabel();
    }

    function clear() {
      selected.clear();
      renderList();
      updateLabel();
      emitChange();
    }

    function selectAll() {
      items.forEach(function (i) { selected.add(i.value); });
      renderList();
      updateLabel();
      emitChange();
    }

    const instance = {
      root: root,
      setItems: setItems,
      getSelected: getSelected,
      setSelected: setSelected,
      clear: clear,
      open: function () {
        panel.hidden = false;
        root.classList.add('is-open');
        openDropdowns.add(instance);
      },
      close: function () {
        panel.hidden = true;
        root.classList.remove('is-open');
        openDropdowns.delete(instance);
      },
      toggle: function () {
        if (panel.hidden) instance.open(); else instance.close();
      },
      onChange: function (fn) { listeners.push(fn); }
    };

    button.addEventListener('click', function (event) {
      event.stopPropagation();
      instance.toggle();
    });

    root.querySelector('[data-action="all"]').addEventListener('click', function (event) {
      event.preventDefault();
      selectAll();
    });

    root.querySelector('[data-action="clear"]').addEventListener('click', function (event) {
      event.preventDefault();
      clear();
    });

    updateLabel();
    return instance;
  }

  window.createMultiDropdown = createMultiDropdown;
})();
