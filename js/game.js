(function () {
    'use strict';

    // ============ DOM элементы ============
    const poemLinesEl = document.getElementById('poemLines');
    const wordsBankEl = document.getElementById('wordsBank');
    const messageEl = document.getElementById('messageArea');
    const checkBtn = document.getElementById('checkBtn');
    const hintBtn = document.getElementById('hintBtn');
    const nextBtn = document.getElementById('nextBtn');
    const progressText = document.getElementById('progressText');
    const poemEraEl = document.getElementById('poemEra');
    const poemAuthorEl = document.getElementById('poemAuthor');
    const poemTopicEl = document.getElementById('poemTopic');
    const eraFiltersEl = document.getElementById('eraFilters');
    const topicFiltersEl = document.getElementById('topicFilters');
    const glossaryBtn = document.getElementById('glossaryBtn');
    const overlayEl = document.getElementById('overlay');
    const modalEl = document.getElementById('glossaryModal');
    const modalCloseEl = document.getElementById('modalClose');
    const modalBodyEl = document.getElementById('modalBody');
    const tooltipPopup = document.getElementById('tooltipPopup');

    // ============ Состояние игры ============
    let currentPoem = null;
    let slots = [];
    let bankWords = [];
    let gameCompleted = false;
    let currentEraFilter = 'all';
    let currentTopicFilter = 'all';
    let hintUsed = false;

    // ============ Инициализация фильтров ============
    function renderTopicFilters() {
        topicFiltersEl.innerHTML = '';
        
        const allBtn = document.createElement('button');
        allBtn.className = 'filter-btn active';
        allBtn.dataset.topic = 'all';
        allBtn.textContent = 'Все';
        allBtn.addEventListener('click', () => setTopicFilter('all'));
        topicFiltersEl.appendChild(allBtn);

        GAME_DATA.topics.forEach(topic => {
            const btn = document.createElement('button');
            btn.className = 'filter-btn';
            btn.dataset.topic = topic.key;
            btn.textContent = topic.name;
            btn.addEventListener('click', () => setTopicFilter(topic.key));
            topicFiltersEl.appendChild(btn);
        });
    }

    function initEraFilters() {
        document.querySelectorAll('#eraFilters .filter-btn').forEach(btn => {
            btn.removeEventListener('click', handleEraClick);
            btn.addEventListener('click', handleEraClick);
        });
    }

    function handleEraClick(e) {
        setEraFilter(e.target.dataset.era);
    }

    function setEraFilter(era) {
        currentEraFilter = era;
        document.querySelectorAll('#eraFilters .filter-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.era === era);
        });
        loadRandomPoem();
    }

    function setTopicFilter(topic) {
        currentTopicFilter = topic;
        document.querySelectorAll('#topicFilters .filter-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.topic === topic);
        });
        loadRandomPoem();
    }

    // ============ Загрузка стихотворения ============
    function getFilteredPoems() {
        return GAME_DATA.poems.filter(poem => {
            const eraMatch = currentEraFilter === 'all' || poem.era === currentEraFilter;
            const topicMatch = currentTopicFilter === 'all' || poem.topic === currentTopicFilter;
            return eraMatch && topicMatch;
        });
    }

    function loadRandomPoem() {
        const filtered = getFilteredPoems();
        if (filtered.length === 0) {
            poemLinesEl.innerHTML = '<p style="color:#8e7a65;">Нет стихов по выбранным фильтрам</p>';
            wordsBankEl.innerHTML = '';
            messageEl.textContent = '';
            progressText.textContent = 'Стих 0 из 0';
            return;
        }

        const randomIndex = Math.floor(Math.random() * filtered.length);
        currentPoem = filtered[randomIndex];
        hintUsed = false;
        gameCompleted = false;
        nextBtn.style.display = 'none';
        checkBtn.style.display = 'inline-block';
        hintBtn.style.display = 'inline-block';
        messageEl.textContent = '';
        messageEl.classList.remove('win');

        const era = GAME_DATA.eras.find(e => e.key === currentPoem.era);
        const topic = GAME_DATA.topics.find(t => t.key === currentPoem.topic);
        poemEraEl.textContent = era ? era.name : '';
        poemAuthorEl.textContent = currentPoem.author;
        poemTopicEl.textContent = topic ? topic.name : '';

        renderPoem(currentPoem);
        bankWords = [...currentPoem.words];
        renderBank(bankWords);

        const totalFiltered = filtered.length;
        const currentIndex = filtered.indexOf(currentPoem) + 1;
        progressText.textContent = `Стих ${currentIndex} из ${totalFiltered}`;
    }

    function renderPoem(poem) {
        poemLinesEl.innerHTML = '';
        slots = [];

        // Разбиваем шаблон на строки — пробуем разные варианты разделителей
        let lines = [];
        if (poem.template.includes('\\n')) {
            // Если в данных реально экранированный \n
            lines = poem.template.split('\\n');
        } else if (poem.template.includes('\n')) {
            // Если в данных реальный перенос строки
            lines = poem.template.split('\n');
        } else {
            // Если нет переносов — вся строка как одна
            lines = [poem.template];
        }

        lines.forEach((line) => {
            // Пропускаем пустые строки
            if (line.trim() === '') return;

            // Создаем контейнер div для каждой строки стиха
            const lineDiv = document.createElement('div');
            lineDiv.style.display = 'block';
            lineDiv.style.width = '100%';
            lineDiv.style.textAlign = 'center';
            lineDiv.style.marginBottom = '0.15em';

            // Разбиваем строку на части с пропусками
            const parts = line.split(/(\{\d+\})/g);

            parts.forEach(part => {
                const match = part.match(/\{(\d+)\}/);
                if (match) {
                    const slotSpan = document.createElement('span');
                    slotSpan.className = 'word-slot';
                    slotSpan.textContent = '_____';
                    slotSpan.dataset.slotIndex = match[1];

                    slots.push({
                        element: slotSpan,
                        index: parseInt(match[1]),
                        currentWord: null
                    });

                    lineDiv.appendChild(slotSpan);
                } else if (part) {
                    // Добавляем текст как текстовый узел
                    lineDiv.appendChild(document.createTextNode(part));
                }
            });

            poemLinesEl.appendChild(lineDiv);
        });

        attachSlotListeners();
    }

    // ============ Drag and Drop + Tap ============
    let draggedWord = null;

    function renderBank(words) {
        wordsBankEl.innerHTML = '';
        words.forEach(word => {
            const tile = document.createElement('div');
            tile.className = 'word-tile';
            tile.textContent = word;
            tile.draggable = true;
            tile.dataset.word = word;

            tile.addEventListener('dragstart', handleDragStart);
            tile.addEventListener('dragend', handleDragEnd);
            tile.addEventListener('click', () => handleWordClick(word, tile));

            wordsBankEl.appendChild(tile);
        });
    }

    function handleDragStart(e) {
        if (gameCompleted) return;
        draggedWord = e.target.dataset.word;
        e.dataTransfer.setData('text/plain', draggedWord);
        e.target.classList.add('dragging');
    }

    function handleDragEnd(e) {
        e.target.classList.remove('dragging');
        document.querySelectorAll('.word-slot').forEach(s => s.classList.remove('highlight'));
    }

    function handleWordClick(word, tile) {
        if (gameCompleted) return;
        const emptySlot = slots.find(s => s.currentWord === null);
        if (!emptySlot) {
            messageEl.textContent = 'Все пропуски уже заполнены. Нажмите на слово в стихе, чтобы вернуть его.';
            return;
        }
        fillSlot(emptySlot, word);
    }

    function fillSlot(slotData, word) {
        if (!bankWords.includes(word)) return;

        const idx = bankWords.indexOf(word);
        bankWords.splice(idx, 1);

        slotData.currentWord = word;
        slotData.element.textContent = word;
        slotData.element.classList.add('filled');

        renderBank(bankWords);

        const allFilled = slots.every(s => s.currentWord !== null);
        if (allFilled) {
            messageEl.textContent = 'Все строки заполнены! Нажмите «Проверить».';
        }
    }

    function clearSlot(slotData) {
        if (gameCompleted) return;
        if (slotData.currentWord) {
            bankWords.push(slotData.currentWord);
            slotData.currentWord = null;
            slotData.element.textContent = '_____';
            slotData.element.classList.remove('filled');
            renderBank(bankWords);
            messageEl.textContent = '';
        }
    }

    function attachSlotListeners() {
        slots.forEach(slot => {
            const el = slot.element;

            el.addEventListener('dragover', e => {
                e.preventDefault();
                if (!gameCompleted) el.classList.add('highlight');
            });

            el.addEventListener('dragleave', () => {
                el.classList.remove('highlight');
            });

            el.addEventListener('drop', e => {
                e.preventDefault();
                el.classList.remove('highlight');
                if (gameCompleted) return;

                const word = e.dataTransfer.getData('text/plain');
                if (!word) return;

                if (slot.currentWord) {
                    bankWords.push(slot.currentWord);
                    slot.currentWord = null;
                }

                fillSlot(slot, word);
            });

            el.addEventListener('click', () => {
                if (slot.currentWord) {
                    clearSlot(slot);
                }
            });
        });
    }

    // ============ Проверка ============
    function checkPoem() {
        if (gameCompleted) return;

        const allFilled = slots.every(s => s.currentWord !== null);
        if (!allFilled) {
            messageEl.textContent = 'Заполните все пропуски!';
            return;
        }

        let correctCount = 0;
        slots.forEach(slot => {
            const expected = currentPoem.correct[slot.index];
            if (slot.currentWord === expected) {
                correctCount++;
            }
        });

        if (correctCount === slots.length) {
            messageEl.textContent = '🎉 Браво! Вы настоящий поэт!';
            messageEl.classList.add('win');
            gameCompleted = true;
            nextBtn.style.display = 'inline-block';
            checkBtn.style.display = 'none';
            hintBtn.style.display = 'none';
        } else {
            const wrongCount = slots.length - correctCount;
            messageEl.textContent = `Не совсем верно. ${wrongCount} из ${slots.length} слов не на месте. Попробуйте иначе!`;
            messageEl.classList.remove('win');
        }
    }

    // ============ Подсказка ============
    function showHint() {
        if (gameCompleted) return;
        if (hintUsed) {
            messageEl.textContent = 'Подсказка уже использована для этого стиха!';
            return;
        }

        for (let slot of slots) {
            const expected = currentPoem.correct[slot.index];
            if (slot.currentWord !== expected) {
                if (slot.currentWord) {
                    bankWords.push(slot.currentWord);
                }
                const bankIdx = bankWords.indexOf(expected);
                if (bankIdx !== -1) {
                    bankWords.splice(bankIdx, 1);
                }
                slot.currentWord = expected;
                slot.element.textContent = expected;
                slot.element.classList.add('filled');
                renderBank(bankWords);
                messageEl.textContent = '💡 Одно слово подставлено!';
                hintUsed = true;
                return;
            }
        }
    }

    // ============ Модальное окно справки ============
    function buildGlossary() {
        let html = '';

        html += '<div class="era-section"><h3>🏛️ Эпохи</h3>';
        GAME_DATA.eras.forEach(era => {
            html += `<p><strong>${era.name}</strong> — ${era.definition}</p>`;
        });
        html += '</div>';

        html += '<div class="era-section"><h3>🏷️ Темы</h3>';
        GAME_DATA.topics.forEach(topic => {
            html += `<p><strong>${topic.name}</strong> — ${topic.definition}</p>`;
        });
        html += '</div>';

        return html;
    }

    function openGlossary() {
        modalBodyEl.innerHTML = buildGlossary();
        overlayEl.classList.add('visible');
        modalEl.classList.add('visible');
    }

    function closeGlossary() {
        overlayEl.classList.remove('visible');
        modalEl.classList.remove('visible');
    }

    // ============ Тултипы для мета-тегов ============
    function showTagTooltip(e, type, key) {
        let definition = '';
        if (type === 'era') {
            const era = GAME_DATA.eras.find(er => er.key === key);
            if (era) definition = era.definition;
        } else if (type === 'topic') {
            const topic = GAME_DATA.topics.find(t => t.key === key);
            if (topic) definition = topic.definition;
        }

        if (!definition) return;

        const rect = e.target.getBoundingClientRect();
        tooltipPopup.textContent = definition;
        tooltipPopup.style.left = rect.left + 'px';
        tooltipPopup.style.top = (rect.bottom + 8) + 'px';
        tooltipPopup.classList.add('visible');
    }

    function hideTagTooltip() {
        tooltipPopup.classList.remove('visible');
    }

    // ============ Обработчики событий ============
    checkBtn.addEventListener('click', checkPoem);
    hintBtn.addEventListener('click', showHint);
    nextBtn.addEventListener('click', loadRandomPoem);

    glossaryBtn.addEventListener('click', openGlossary);
    modalCloseEl.addEventListener('click', closeGlossary);
    overlayEl.addEventListener('click', closeGlossary);

    poemEraEl.addEventListener('click', function (e) {
        if (currentPoem) showTagTooltip(e, 'era', currentPoem.era);
    });
    poemTopicEl.addEventListener('click', function (e) {
        if (currentPoem) showTagTooltip(e, 'topic', currentPoem.topic);
    });

    document.addEventListener('click', function (e) {
        if (!e.target.closest('.poem-era') && !e.target.closest('.poem-topic') && !e.target.closest('.tooltip-popup')) {
            hideTagTooltip();
        }
    });

    // ============ Запуск ============
    function init() {
        document.addEventListener('dragover', e => e.preventDefault());
        document.addEventListener('drop', e => e.preventDefault());

        renderTopicFilters();
        initEraFilters();
        loadRandomPoem();
    }

    init();
})();