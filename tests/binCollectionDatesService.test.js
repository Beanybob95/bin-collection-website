const {
    parseDotNetDate,
    extractModelDataFromHtml,
    parseMonthCollectionDates,
    dedupeByUprnTypeDate,
} = require('../services/binCollectionDatesService');

const MS = 1746403200000;
const EXPECTED_DATE = new Date(MS);

describe('parseDotNetDate', () => {
    test('parses standard /Date(ms)/ format', () => {
        expect(parseDotNetDate(`/Date(${MS})/`)).toEqual(EXPECTED_DATE);
    });

    test('parses escaped \\/Date(ms)\\/ variant', () => {
        expect(parseDotNetDate(`\\/Date(${MS})\\/`)).toEqual(EXPECTED_DATE);
    });

    test('returns null for null', () => {
        expect(parseDotNetDate(null)).toBeNull();
    });

    test('returns null for undefined', () => {
        expect(parseDotNetDate(undefined)).toBeNull();
    });

    test('returns null for a string with no date pattern', () => {
        expect(parseDotNetDate('not-a-date')).toBeNull();
    });
});

describe('extractModelDataFromHtml', () => {
    test('extracts and parses modelData from HTML', () => {
        const html = `<script>var modelData = {"key": "val"};</script>`;
        expect(extractModelDataFromHtml(html)).toEqual({ key: 'val' });
    });

    test('returns null when modelData is absent', () => {
        expect(
            extractModelDataFromHtml('<html lang="en">no data here</html>')
        ).toBeNull();
    });

    test('returns null when modelData contains malformed JSON', () => {
        const html = `<script>var modelData = {bad json};</script>`;
        expect(extractModelDataFromHtml(html)).toBeNull();
    });
});

describe('parseMonthCollectionDates', () => {
    const uprn = '12345';

    const makeHtml = (rows) =>
        `<script>var modelData = ${JSON.stringify({ MonthCollectionDates: rows })};</script>`;

    test('returns correctly shaped objects for valid rows', () => {
        const html = makeHtml([
            {
                Date: `/Date(${MS})/`,
                RoundTypeCode: 'RES',
                RoundTypeName: 'Residual Waste',
            },
        ]);
        expect(parseMonthCollectionDates(html, uprn)).toEqual([
            {
                date: EXPECTED_DATE,
                type: 'res',
                description: 'Residual Waste',
                uprn,
            },
        ]);
    });

    test('filters out rows missing Date', () => {
        const html = makeHtml([
            {
                Date: null,
                RoundTypeCode: 'RES',
                RoundTypeName: 'Residual Waste',
            },
        ]);
        expect(parseMonthCollectionDates(html, uprn)).toEqual([]);
    });

    test('filters out rows missing RoundTypeCode', () => {
        const html = makeHtml([
            {
                Date: `/Date(${MS})/`,
                RoundTypeCode: '',
                RoundTypeName: 'Residual Waste',
            },
        ]);
        expect(parseMonthCollectionDates(html, uprn)).toEqual([]);
    });

    test('returns [] when MonthCollectionDates is not an array', () => {
        const html = `<script>var modelData = {"MonthCollectionDates": null};</script>`;
        expect(parseMonthCollectionDates(html, uprn)).toEqual([]);
    });

    test('returns [] when HTML has no modelData', () => {
        expect(
            parseMonthCollectionDates('<html lang="en"></html>', uprn)
        ).toEqual([]);
    });
});

describe('dedupeByUprnTypeDate', () => {
    const makeItem = (uprn, type, date) => ({
        uprn,
        type,
        date: new Date(date),
    });

    test('returns all items when there are no duplicates', () => {
        const items = [makeItem('1', 'res', MS), makeItem('1', 'pod', MS)];
        expect(dedupeByUprnTypeDate(items)).toHaveLength(2);
    });

    test('removes duplicate uprn+type+date entries, keeping the first', () => {
        const items = [
            { ...makeItem('1', 'res', MS), description: 'first' },
            { ...makeItem('1', 'res', MS), description: 'duplicate' },
        ];
        const result = dedupeByUprnTypeDate(items);
        expect(result).toHaveLength(1);
        expect(result[0].description).toBe('first');
    });

    test('returns [] for an empty array', () => {
        expect(dedupeByUprnTypeDate([])).toEqual([]);
    });
});
