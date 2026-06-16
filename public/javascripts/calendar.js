const collections = JSON.parse(
    document.getElementById('collections-data').dataset.collections
);

const typeLabels = {
    res: 'Household waste',
    pod: 'Recycling & Glass',
    cgw: 'Garden waste',
};

const monthNames = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
];

const today = new Date();
let currentYear = today.getFullYear();
let currentMonth = today.getMonth();

function getMonthYearFromURL() {
    const params = new URLSearchParams(window.location.search);
    const year = parseInt(params.get('year'), 10);
    const month = parseInt(params.get('month'), 10);

    if (
        Number.isInteger(year) &&
        year >= 2000 &&
        year <= 2100 &&
        Number.isInteger(month) &&
        month >= 1 &&
        month <= 12
    ) {
        return { year, month: month - 1 };
    }

    return null;
}

function pushMonthYearToURL() {
    const url = new URL(window.location.href);
    url.searchParams.set('year', currentYear);
    url.searchParams.set('month', currentMonth + 1);
    history.pushState({ year: currentYear, month: currentMonth }, '', url);
}

function getCollectionsForDay(year, month, day) {
    return collections.filter((collection) => {
        const collectionDate = new Date(collection.date);
        return (
            collectionDate.getFullYear() === year &&
            collectionDate.getMonth() === month &&
            collectionDate.getDate() === day
        );
    });
}

function updateCalendarHeader() {
    document.getElementById('currentMonthYear').textContent =
        `${monthNames[currentMonth]} ${currentYear}`;
}

function buildCalendarGrid(lastDay, startingDay, prevMonthLastDay) {
    const today = new Date();
    const isCurrentMonth =
        today.getMonth() === currentMonth &&
        today.getFullYear() === currentYear;
    const todayDate = today.getDate();

    const calendarGrid = document.getElementById('calendar-grid');
    calendarGrid.innerHTML = '';

    let currentDay = 1;
    let nextMonthDay = 1;

    for (let week = 0; week < 6; week++) {
        const weekRow = document.createElement('div');
        weekRow.className = 'calendar-week';
        weekRow.setAttribute('role', 'row');

        for (let weekday = 0; weekday < 7; weekday++) {
            const i = week * 7 + weekday;
            const dayDiv = document.createElement('div');
            dayDiv.className = 'calendar-day';
            dayDiv.setAttribute('role', 'gridcell');

            if (i < startingDay) {
                const prevMonthDate = prevMonthLastDay - (startingDay - i - 1);
                dayDiv.innerHTML = `<div class="date-number">${prevMonthDate}</div>`;
                dayDiv.classList.add('other-month');
                dayDiv.setAttribute('aria-hidden', 'true');
            } else if (currentDay <= lastDay.getDate()) {
                const dateNumberClass =
                    isCurrentMonth && currentDay === todayDate
                        ? 'date-number today'
                        : 'date-number';
                dayDiv.innerHTML = `<div class="${dateNumberClass}">${currentDay}</div>`;

                const collectionsToday = getCollectionsForDay(
                    currentYear,
                    currentMonth,
                    currentDay
                );
                const dateLabel = new Date(
                    currentYear,
                    currentMonth,
                    currentDay
                ).toLocaleDateString('en-GB', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long',
                });
                const collectionLabels = collectionsToday
                    .map((c) => typeLabels[c.type] || 'Other collection')
                    .join(', ');
                dayDiv.setAttribute(
                    'aria-label',
                    collectionLabels
                        ? `${dateLabel}, ${collectionLabels} collection`
                        : dateLabel
                );

                collectionsToday.forEach((collection) => {
                    const eventDiv = document.createElement('div');
                    eventDiv.className = `collection-event ${collection.type}`;
                    eventDiv.textContent =
                        typeLabels[collection.type] || 'Other collection';
                    dayDiv.appendChild(eventDiv);
                });

                currentDay++;
            } else {
                dayDiv.innerHTML = `<div class="date-number">${nextMonthDay}</div>`;
                dayDiv.classList.add('other-month');
                dayDiv.setAttribute('aria-hidden', 'true');
                nextMonthDay++;
            }

            weekRow.appendChild(dayDiv);
        }

        calendarGrid.appendChild(weekRow);
    }
}

function buildAgenda(daysInMonth) {
    const agenda = document.getElementById('calendar-agenda');
    agenda.innerHTML = '';

    let hasEntries = false;

    for (let day = 1; day <= daysInMonth; day++) {
        const dayCollections = getCollectionsForDay(
            currentYear,
            currentMonth,
            day
        );
        if (dayCollections.length === 0) continue;

        hasEntries = true;
        const dateLabel = new Date(
            currentYear,
            currentMonth,
            day
        ).toLocaleDateString('en-GB', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
        });

        dayCollections.forEach((collection) => {
            const li = document.createElement('li');
            li.className = `calendar-agenda-item ${collection.type}`;
            li.textContent = `${dateLabel} — ${typeLabels[collection.type] || 'Other collection'}`;
            agenda.appendChild(li);
        });
    }

    if (!hasEntries) {
        const li = document.createElement('li');
        li.className = 'calendar-agenda-empty';
        li.textContent = 'No collections this month.';
        agenda.appendChild(li);
    }
}

function createCalendar() {
    updateCalendarHeader();

    const firstDay = new Date(currentYear, currentMonth, 1);
    const lastDay = new Date(currentYear, currentMonth + 1, 0);
    const startingDay = firstDay.getDay();
    const prevMonthLastDay = new Date(currentYear, currentMonth, 0).getDate();

    buildCalendarGrid(lastDay, startingDay, prevMonthLastDay);
    buildAgenda(lastDay.getDate());
}

function navigateToPreviousMonth() {
    currentMonth--;
    if (currentMonth < 0) {
        currentMonth = 11;
        currentYear--;
    }
    createCalendar();
    pushMonthYearToURL();
}

function navigateToNextMonth() {
    currentMonth++;
    if (currentMonth > 11) {
        currentMonth = 0;
        currentYear++;
    }
    createCalendar();
    pushMonthYearToURL();
}

function navigateToToday() {
    const todayDate = new Date();
    currentMonth = todayDate.getMonth();
    currentYear = todayDate.getFullYear();
    createCalendar();
    pushMonthYearToURL();
}

document.addEventListener('DOMContentLoaded', () => {
    const fromURL = getMonthYearFromURL();
    if (fromURL) {
        currentYear = fromURL.year;
        currentMonth = fromURL.month;
    }

    createCalendar();

    document
        .getElementById('prevMonth')
        .addEventListener('click', navigateToPreviousMonth);
    document
        .getElementById('todayButton')
        .addEventListener('click', navigateToToday);
    document
        .getElementById('nextMonth')
        .addEventListener('click', navigateToNextMonth);
});

window.addEventListener('popstate', () => {
    const fromURL = getMonthYearFromURL();
    const target = fromURL || {
        year: today.getFullYear(),
        month: today.getMonth(),
    };
    currentYear = target.year;
    currentMonth = target.month;
    createCalendar();
});
