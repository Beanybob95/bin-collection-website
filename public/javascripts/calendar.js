const collections = JSON.parse(
    document.getElementById('collections-data').textContent
);

const typeLabels = {
    res: 'Household waste',
    pod: 'Recycling & Glass',
    cgw: 'Garden waste',
};

const today = new Date();
let currentYear = today.getFullYear();
let currentMonth = today.getMonth();

function updateCalendarHeader() {
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
    document.getElementById('currentMonthYear').textContent =
        `${monthNames[currentMonth]} ${currentYear}`;
}

function createCalendar() {
    updateCalendarHeader();

    const firstDay = new Date(currentYear, currentMonth, 1);
    const lastDay = new Date(currentYear, currentMonth + 1, 0);
    const startingDay = firstDay.getDay();

    const today = new Date();
    const isCurrentMonth =
        today.getMonth() === currentMonth &&
        today.getFullYear() === currentYear;
    const todayDate = today.getDate();

    const prevMonthLastDay = new Date(currentYear, currentMonth, 0).getDate();

    const calendarGrid = document.getElementById('calendar-grid');
    calendarGrid.innerHTML = '';

    let currentDay = 1;
    let nextMonthDay = 1;

    for (let i = 0; i < 42; i++) {
        const dayDiv = document.createElement('div');
        dayDiv.className = 'calendar-day';

        if (i < startingDay) {
            const prevMonthDate = prevMonthLastDay - (startingDay - i - 1);
            dayDiv.innerHTML = `<div class="date-number">${prevMonthDate}</div>`;
            dayDiv.classList.add('other-month');
        } else if (currentDay <= lastDay.getDate()) {
            const dateNumberClass =
                isCurrentMonth && currentDay === todayDate
                    ? 'date-number today'
                    : 'date-number';
            dayDiv.innerHTML = `<div class="${dateNumberClass}">${currentDay}</div>`;

            const collectionsToday = collections.filter((collection) => {
                const collectionDate = new Date(collection.date);
                return (
                    collectionDate.getFullYear() === currentYear &&
                    collectionDate.getMonth() === currentMonth &&
                    collectionDate.getDate() === currentDay
                );
            });

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
            nextMonthDay++;
        }

        calendarGrid.appendChild(dayDiv);
    }
}

function navigateToPreviousMonth() {
    currentMonth--;
    if (currentMonth < 0) {
        currentMonth = 11;
        currentYear--;
    }
    createCalendar();
}

function navigateToNextMonth() {
    currentMonth++;
    if (currentMonth > 11) {
        currentMonth = 0;
        currentYear++;
    }
    createCalendar();
}

function navigateToToday() {
    const todayDate = new Date();
    currentMonth = todayDate.getMonth();
    currentYear = todayDate.getFullYear();
    createCalendar();
}

document.addEventListener('DOMContentLoaded', () => {
    createCalendar();

    document
        .getElementById('prevMonth')
        .addEventListener('click', function (e) {
            e.preventDefault();
            navigateToPreviousMonth();
        });
    document
        .getElementById('nextMonth')
        .addEventListener('click', function (e) {
            e.preventDefault();
            navigateToNextMonth();
        });
    document
        .getElementById('todayButton')
        .addEventListener('click', function (e) {
            e.preventDefault();
            navigateToToday();
        });
});
