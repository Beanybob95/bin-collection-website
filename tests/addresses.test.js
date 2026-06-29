const Address = require('../models/Address');
const User = require('../models/User');
const { index, show, create, addUser } = require('../controllers/addresses');

jest.mock('../models/Address');
jest.mock('../models/User');

const mockReq = ({ body = {}, params = {}, session = {} } = {}) => ({
    body,
    params,
    session,
    get: jest.fn(),
});

const mockRes = () => {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.render = jest.fn().mockReturnValue(res);
    res.redirect = jest.fn().mockReturnValue(res);
    return res;
};

describe('index', () => {
    let res, next;

    beforeEach(() => {
        res = mockRes();
        next = jest.fn();
        jest.clearAllMocks();
    });

    test('renders index with the user\'s populated addresses', async () => {
        const mockUser = { addresses: [{ _id: 'addr-1' }, { _id: 'addr-2' }] };
        User.findById.mockReturnValue({ populate: jest.fn().mockResolvedValue(mockUser) });

        await index(mockReq({ session: { userId: 'user-123' } }), res, next);

        expect(res.render).toHaveBeenCalledWith(
            'addresses/index',
            expect.objectContaining({ addresses: mockUser.addresses })
        );
    });

    test('calls next with 404 when user is not found in DB', async () => {
        User.findById.mockReturnValue({ populate: jest.fn().mockResolvedValue(null) });

        await index(mockReq({ session: { userId: 'user-123' } }), res, next);

        expect(next).toHaveBeenCalledWith(expect.objectContaining({ status: 404 }));
        expect(res.render).not.toHaveBeenCalled();
    });

    test('calls next on DB error', async () => {
        User.findById.mockReturnValue({
            populate: jest.fn().mockRejectedValue(new Error('DB connection lost')),
        });

        await index(mockReq({ session: { userId: 'user-123' } }), res, next);

        expect(next).toHaveBeenCalledWith(expect.any(Error));
    });
});

describe('create', () => {
    const validBody = {
        uprn: '100012345678',
        postcode: 'SW1A 1AA',
        housenumber: '10',
        roadname: 'Downing Street',
        county: 'London',
    };

    let res, next;

    beforeEach(() => {
        res = mockRes();
        next = jest.fn();
        jest.clearAllMocks();
    });

    test('reuses existing address when UPRN already exists rather than creating a duplicate', async () => {
        const existing = { _id: 'existing-addr-123' };
        Address.findOne.mockResolvedValue(existing);
        User.findByIdAndUpdate.mockResolvedValue({});

        await create(mockReq({ body: validBody, session: { userId: 'user-123' } }), res, next);

        expect(Address).not.toHaveBeenCalled();
        expect(res.redirect).toHaveBeenCalledWith('/addresses');
    });

    test('creates a new address when UPRN is not found', async () => {
        const mockSave = jest.fn().mockResolvedValue({});
        const mockInstance = { _id: 'new-addr-123', save: mockSave };
        Address.findOne.mockResolvedValue(null);
        Address.mockImplementation(() => mockInstance);
        User.findByIdAndUpdate.mockResolvedValue({});

        await create(mockReq({ body: validBody, session: { userId: 'user-123' } }), res, next);

        expect(Address).toHaveBeenCalledWith(expect.objectContaining({ uprn: '100012345678' }));
        expect(mockSave).toHaveBeenCalled();
    });

    test('links address to user using $addToSet to prevent duplicate entries', async () => {
        Address.findOne.mockResolvedValue({ _id: 'addr-123' });
        User.findByIdAndUpdate.mockResolvedValue({});

        await create(mockReq({ body: validBody, session: { userId: 'user-123' } }), res, next);

        expect(User.findByIdAndUpdate).toHaveBeenCalledWith(
            'user-123',
            { $addToSet: { addresses: 'addr-123' } }
        );
    });

    test('redirects to /addresses on success', async () => {
        Address.findOne.mockResolvedValue({ _id: 'addr-123' });
        User.findByIdAndUpdate.mockResolvedValue({});

        await create(mockReq({ body: validBody, session: { userId: 'user-123' } }), res, next);

        expect(res.redirect).toHaveBeenCalledWith('/addresses');
    });

    test('calls next with status 400 on Mongoose ValidationError', async () => {
        const err = Object.assign(new Error('Validation failed'), { name: 'ValidationError' });
        Address.findOne.mockRejectedValue(err);

        await create(mockReq({ body: validBody, session: { userId: 'user-123' } }), res, next);

        expect(next).toHaveBeenCalledWith(expect.objectContaining({ status: 400 }));
    });

    test('calls next on unexpected DB error', async () => {
        Address.findOne.mockRejectedValue(new Error('DB connection lost'));

        await create(mockReq({ body: validBody, session: { userId: 'user-123' } }), res, next);

        expect(next).toHaveBeenCalledWith(expect.any(Error));
    });
});

describe('addUser', () => {
    const addressId = 'addr-123';
    const mockAddress = { _id: addressId };

    let res, next;

    beforeEach(() => {
        res = mockRes();
        next = jest.fn();
        jest.clearAllMocks();
    });

    test('returns 404 when current user does not own the address', async () => {
        User.findOne.mockResolvedValue(null);

        await addUser(
            mockReq({ params: { id: addressId }, session: { userId: 'user-456' } }),
            res,
            next
        );

        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.render).not.toHaveBeenCalled();
    });

    test('normalises email to lowercase and trims whitespace before lookup', async () => {
        User.findOne
            .mockResolvedValueOnce({ _id: 'user-456' })
            .mockResolvedValueOnce(null);
        Address.findById.mockResolvedValue(mockAddress);

        await addUser(
            mockReq({
                body: { email: '  FRIEND@TEST.COM  ' },
                params: { id: addressId },
                session: { userId: 'user-456' },
            }),
            res,
            next
        );

        expect(User.findOne).toHaveBeenCalledWith({ email: 'friend@test.com' });
    });

    test('handles missing email field without throwing', async () => {
        User.findOne
            .mockResolvedValueOnce({ _id: 'user-456' })
            .mockResolvedValueOnce(null);
        Address.findById.mockResolvedValue(mockAddress);

        await expect(
            addUser(
                mockReq({ body: {}, params: { id: addressId }, session: { userId: 'user-456' } }),
                res,
                next
            )
        ).resolves.not.toThrow();

        expect(User.findOne).toHaveBeenCalledWith({ email: '' });
    });

    test('re-renders form with error when no account found for that email', async () => {
        User.findOne
            .mockResolvedValueOnce({ _id: 'user-456' })
            .mockResolvedValueOnce(null);
        Address.findById.mockResolvedValue(mockAddress);

        await addUser(
            mockReq({
                body: { email: 'nobody@test.com' },
                params: { id: addressId },
                session: { userId: 'user-456' },
            }),
            res,
            next
        );

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.render).toHaveBeenCalledWith(
            'addresses/users-new',
            expect.objectContaining({ error: expect.stringContaining('No account found') })
        );
    });

    test('links found user to address with $addToSet and redirects', async () => {
        const userToAdd = { _id: 'user-789' };
        User.findOne
            .mockResolvedValueOnce({ _id: 'user-456' })
            .mockResolvedValueOnce(userToAdd);
        Address.findById.mockResolvedValue(mockAddress);
        User.findByIdAndUpdate.mockResolvedValue({});

        await addUser(
            mockReq({
                body: { email: 'friend@test.com' },
                params: { id: addressId },
                session: { userId: 'user-456' },
            }),
            res,
            next
        );

        expect(User.findByIdAndUpdate).toHaveBeenCalledWith(
            'user-789',
            { $addToSet: { addresses: addressId } }
        );
        expect(res.redirect).toHaveBeenCalledWith(`/addresses/${addressId}`);
    });

    test('calls next on DB error', async () => {
        User.findOne.mockRejectedValue(new Error('DB connection lost'));

        await addUser(
            mockReq({ params: { id: addressId }, session: { userId: 'user-456' } }),
            res,
            next
        );

        expect(next).toHaveBeenCalledWith(expect.any(Error));
    });
});

describe('show', () => {
    const addressId = 'addr-123';

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

    test('renders show view with address, linked users, and currentUserId', async () => {
        const mockAddress = { _id: addressId, uprn: '100012345678' };
        const mockUsers = [{ _id: 'user-456' }, { _id: 'user-789' }];
        User.findOne.mockResolvedValue({ _id: 'user-456' });
        Address.findById.mockResolvedValue(mockAddress);
        User.find.mockResolvedValue(mockUsers);

        await show(
            mockReq({ params: { id: addressId }, session: { userId: 'user-456' } }),
            res,
            next
        );

        expect(res.render).toHaveBeenCalledWith(
            'addresses/show',
            expect.objectContaining({
                address: mockAddress,
                users: mockUsers,
                currentUserId: 'user-456',
            })
        );
    });

    test('does not fetch address when authorization check fails, avoiding unnecessary DB queries', async () => {
        User.findOne.mockResolvedValue(null);

        await show(
            mockReq({ params: { id: addressId }, session: { userId: 'user-456' } }),
            res,
            next
        );

        expect(Address.findById).not.toHaveBeenCalled();
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
});
