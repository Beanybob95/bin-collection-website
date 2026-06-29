const Address = require('../models/Address');
const User = require('../models/User');
const BinCollectionDates = require('../models/BinCollectionDates');
const { getCollectionDatesThisYear } = require('../services/binCollectionDatesService');
const { show, refresh } = require('../controllers/binCollections');

jest.mock('../models/Address');
jest.mock('../models/User');
jest.mock('../models/BinCollectionDates');
jest.mock('../services/binCollectionDatesService');

const mockReq = ({ params = {}, session = {} } = {}) => ({ params, session });

const mockRes = () => {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.render = jest.fn().mockReturnValue(res);
    res.redirect = jest.fn().mockReturnValue(res);
    return res;
};

const makeDate = (daysFromToday) => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + daysFromToday);
    return d;
};

const today = makeDate(0);
const tomorrow = makeDate(1);
const nextWeek = makeDate(7);
const yesterday = makeDate(-1);

describe('show', () => {
    const addressId = 'addr-123';
    const mockAddress = { _id: addressId, uprn: '100012345678' };

    let res, next;

    beforeEach(() => {
        res = mockRes();
        next = jest.fn();
        jest.clearAllMocks();
    });

    test('returns 404 when address does not belong to current user', async () => {
        User.findOne.mockResolvedValue(null);

        await show(
            mockReq({ params: { id: addressId }, session: { userId: 'user-456' } }),
            res,
            next
        );

        expect(res.status).toHaveBeenCalledWith(404);
        expect(Address.findById).not.toHaveBeenCalled();
    });

    test('returns 404 when address is not found in DB', async () => {
        User.findOne.mockResolvedValue({ _id: 'user-456' });
        Address.findById.mockResolvedValue(null);

        await show(
            mockReq({ params: { id: addressId }, session: { userId: 'user-456' } }),
            res,
            next
        );

        expect(res.status).toHaveBeenCalledWith(404);
    });

    test('calls next on DB error', async () => {
        User.findOne.mockRejectedValue(new Error('DB connection lost'));

        await show(
            mockReq({ params: { id: addressId }, session: { userId: 'user-456' } }),
            res,
            next
        );

        expect(next).toHaveBeenCalledWith(expect.any(Error));
    });

    describe('nextCollections data transformation', () => {
        beforeEach(() => {
            User.findOne.mockResolvedValue({ _id: 'user-456' });
            Address.findById.mockResolvedValue(mockAddress);
        });

        test('filters out past collections', async () => {
            BinCollectionDates.find.mockResolvedValue([
                { type: 'res', date: yesterday, description: 'Household waste' },
                { type: 'res', date: tomorrow, description: 'Household waste' },
            ]);

            await show(
                mockReq({ params: { id: addressId }, session: { userId: 'user-456' } }),
                res,
                next
            );

            const { nextCollections } = res.render.mock.calls[0][1];
            expect(nextCollections).toHaveLength(1);
            expect(nextCollections[0].date).toEqual(tomorrow);
        });

        test('includes collections scheduled for today', async () => {
            BinCollectionDates.find.mockResolvedValue([
                { type: 'res', date: today, description: 'Household waste' },
            ]);

            await show(
                mockReq({ params: { id: addressId }, session: { userId: 'user-456' } }),
                res,
                next
            );

            const { nextCollections } = res.render.mock.calls[0][1];
            expect(nextCollections).toHaveLength(1);
        });

        test('picks the earliest upcoming date when a type has multiple future entries', async () => {
            BinCollectionDates.find.mockResolvedValue([
                { type: 'res', date: nextWeek, description: 'Household waste' },
                { type: 'res', date: tomorrow, description: 'Household waste' },
            ]);

            await show(
                mockReq({ params: { id: addressId }, session: { userId: 'user-456' } }),
                res,
                next
            );

            const { nextCollections } = res.render.mock.calls[0][1];
            expect(nextCollections).toHaveLength(1);
            expect(nextCollections[0].date).toEqual(tomorrow);
        });

        test('deduplicates types so each bin type appears only once in nextCollections', async () => {
            BinCollectionDates.find.mockResolvedValue([
                { type: 'res', date: tomorrow, description: 'Household waste' },
                { type: 'res', date: nextWeek, description: 'Household waste' },
                { type: 'pod', date: nextWeek, description: 'Recycling' },
            ]);

            await show(
                mockReq({ params: { id: addressId }, session: { userId: 'user-456' } }),
                res,
                next
            );

            const { nextCollections } = res.render.mock.calls[0][1];
            expect(nextCollections).toHaveLength(2);
            expect(nextCollections.map((c) => c.type)).toEqual(
                expect.arrayContaining(['res', 'pod'])
            );
        });

        test('sorts nextCollections by date ascending', async () => {
            BinCollectionDates.find.mockResolvedValue([
                { type: 'pod', date: nextWeek, description: 'Recycling' },
                { type: 'res', date: tomorrow, description: 'Household waste' },
            ]);

            await show(
                mockReq({ params: { id: addressId }, session: { userId: 'user-456' } }),
                res,
                next
            );

            const { nextCollections } = res.render.mock.calls[0][1];
            expect(nextCollections[0].date).toEqual(tomorrow);
            expect(nextCollections[1].date).toEqual(nextWeek);
        });

        test('uses typeLabels for known types and falls back to defaultTypeLabel for unknown types', async () => {
            BinCollectionDates.find.mockResolvedValue([
                { type: 'res', date: tomorrow, description: 'Household waste' },
                { type: 'mystery', date: tomorrow, description: 'Mystery collection' },
            ]);

            await show(
                mockReq({ params: { id: addressId }, session: { userId: 'user-456' } }),
                res,
                next
            );

            const { nextCollections } = res.render.mock.calls[0][1];
            const res_ = nextCollections.find((c) => c.type === 'res');
            const mystery = nextCollections.find((c) => c.type === 'mystery');
            expect(res_.label).toBe('Household waste');
            expect(mystery.label).toBe('Other collection');
        });

        test('produces empty nextCollections when all collections are in the past', async () => {
            BinCollectionDates.find.mockResolvedValue([
                { type: 'res', date: yesterday, description: 'Household waste' },
            ]);

            await show(
                mockReq({ params: { id: addressId }, session: { userId: 'user-456' } }),
                res,
                next
            );

            const { nextCollections } = res.render.mock.calls[0][1];
            expect(nextCollections).toHaveLength(0);
        });
    });
});

describe('refresh', () => {
    const addressId = 'addr-123';

    let res, next;

    beforeEach(() => {
        res = mockRes();
        next = jest.fn();
        jest.clearAllMocks();
    });

    test('returns 404 when address does not belong to current user', async () => {
        User.findOne.mockResolvedValue(null);

        await refresh(
            mockReq({ params: { id: addressId }, session: { userId: 'user-456' } }),
            res,
            next
        );

        expect(res.status).toHaveBeenCalledWith(404);
        expect(getCollectionDatesThisYear).not.toHaveBeenCalled();
    });

    test('returns 404 when address is not found in DB', async () => {
        User.findOne.mockResolvedValue({ _id: 'user-456' });
        Address.findById.mockResolvedValue(null);

        await refresh(
            mockReq({ params: { id: addressId }, session: { userId: 'user-456' } }),
            res,
            next
        );

        expect(res.status).toHaveBeenCalledWith(404);
        expect(getCollectionDatesThisYear).not.toHaveBeenCalled();
    });

    test('redirects without calling the service when within the 1-hour cooldown', async () => {
        const thirtyMinutesAgo = Date.now() - 30 * 60 * 1000;
        User.findOne.mockResolvedValue({ _id: 'user-456' });
        Address.findById.mockResolvedValue({
            _id: addressId,
            postcode: 'SW1A 1AA',
            uprn: '100012345678',
            lastRefresh: thirtyMinutesAgo,
        });

        await refresh(
            mockReq({ params: { id: addressId }, session: { userId: 'user-456' } }),
            res,
            next
        );

        expect(getCollectionDatesThisYear).not.toHaveBeenCalled();
        expect(res.redirect).toHaveBeenCalledWith(`/bincollection/${addressId}`);
    });

    test('calls service when last refresh was more than 1 hour ago', async () => {
        const twoHoursAgo = Date.now() - 2 * 60 * 60 * 1000;
        User.findOne.mockResolvedValue({ _id: 'user-456' });
        Address.findById.mockResolvedValue({
            _id: addressId,
            postcode: 'SW1A 1AA',
            uprn: '100012345678',
            lastRefresh: twoHoursAgo,
        });
        getCollectionDatesThisYear.mockResolvedValue();

        await refresh(
            mockReq({ params: { id: addressId }, session: { userId: 'user-456' } }),
            res,
            next
        );

        expect(getCollectionDatesThisYear).toHaveBeenCalledWith(
            'SW1A 1AA',
            '100012345678',
            addressId
        );
        expect(res.redirect).toHaveBeenCalledWith(`/bincollection/${addressId}`);
    });

    test('calls service when address has never been refreshed before', async () => {
        User.findOne.mockResolvedValue({ _id: 'user-456' });
        Address.findById.mockResolvedValue({
            _id: addressId,
            postcode: 'SW1A 1AA',
            uprn: '100012345678',
            lastRefresh: null,
        });
        getCollectionDatesThisYear.mockResolvedValue();

        await refresh(
            mockReq({ params: { id: addressId }, session: { userId: 'user-456' } }),
            res,
            next
        );

        expect(getCollectionDatesThisYear).toHaveBeenCalled();
    });

    test('calls next on DB error', async () => {
        User.findOne.mockRejectedValue(new Error('DB connection lost'));

        await refresh(
            mockReq({ params: { id: addressId }, session: { userId: 'user-456' } }),
            res,
            next
        );

        expect(next).toHaveBeenCalledWith(expect.any(Error));
    });
});
