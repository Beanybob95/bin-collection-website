const bcrypt = require('bcryptjs');
const User = require('../models/User');
const { signup, login } = require('../controllers/auth');

jest.mock('bcryptjs');
jest.mock('../models/User');

const mockReq = (body = {}) => ({ body, session: {} });

const mockRes = () => {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.render = jest.fn().mockReturnValue(res);
    res.redirect = jest.fn().mockReturnValue(res);
    return res;
};

const validSignupBody = {
    firstname: 'Leon',
    lastname: 'Test',
    email: 'leon@test.com',
    password: 'password123',
    confirmPassword: 'password123',
};

describe('signup', () => {
    let res;

    beforeEach(() => {
        res = mockRes();
        jest.clearAllMocks();
    });

    describe('validation', () => {
        test('re-renders form when a required field is missing', async () => {
            const req = mockReq({ firstname: '', lastname: '', email: '', password: '' });
            await signup(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.render).toHaveBeenCalledWith(
                'auth/signup',
                expect.objectContaining({ error: 'Please fill in all fields' })
            );
        });

        test('re-renders form when password is shorter than 8 characters', async () => {
            const req = mockReq({ ...validSignupBody, password: 'short', confirmPassword: 'short' });
            await signup(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.render).toHaveBeenCalledWith(
                'auth/signup',
                expect.objectContaining({ error: 'Password must be at least 8 characters long' })
            );
        });

        test('re-renders form when passwords do not match', async () => {
            const req = mockReq({ ...validSignupBody, confirmPassword: 'different123' });
            await signup(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.render).toHaveBeenCalledWith(
                'auth/signup',
                expect.objectContaining({ error: 'Passwords do not match' })
            );
        });

        test('re-renders form with submitted data preserved so the user does not retype everything', async () => {
            const req = mockReq({ ...validSignupBody, confirmPassword: 'different123' });
            await signup(req, res);
            expect(res.render).toHaveBeenCalledWith(
                'auth/signup',
                expect.objectContaining({ formData: req.body })
            );
        });

        test('re-renders form when email is already registered', async () => {
            User.findOne.mockResolvedValue({ _id: 'existing-user' });
            const req = mockReq(validSignupBody);
            await signup(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.render).toHaveBeenCalledWith(
                'auth/signup',
                expect.objectContaining({ error: 'An account with that email already exists' })
            );
        });
    });

    describe('successful signup', () => {
        test('hashes password with bcrypt cost factor 10', async () => {
            User.findOne.mockResolvedValue(null);
            bcrypt.hash.mockResolvedValue('hashed-password');
            User.create.mockResolvedValue({ _id: { toString: () => 'user-123' } });

            await signup(mockReq(validSignupBody), res);

            expect(bcrypt.hash).toHaveBeenCalledWith('password123', 10);
        });

        test('creates user with hashed password, not the plain text password', async () => {
            User.findOne.mockResolvedValue(null);
            bcrypt.hash.mockResolvedValue('hashed-password');
            User.create.mockResolvedValue({ _id: { toString: () => 'user-123' } });

            await signup(mockReq(validSignupBody), res);

            expect(User.create).toHaveBeenCalledWith(
                expect.objectContaining({ passwordHash: 'hashed-password' })
            );
            expect(User.create).toHaveBeenCalledWith(
                expect.not.objectContaining({ password: expect.anything() })
            );
        });

        test('sets session userId and redirects to /addresses', async () => {
            User.findOne.mockResolvedValue(null);
            bcrypt.hash.mockResolvedValue('hashed-password');
            User.create.mockResolvedValue({ _id: { toString: () => 'user-123' } });

            const req = mockReq(validSignupBody);
            await signup(req, res);

            expect(req.session.userId).toBe('user-123');
            expect(res.redirect).toHaveBeenCalledWith('/addresses');
        });
    });

    describe('error handling', () => {
        test('re-renders form with mongoose validation error message', async () => {
            User.findOne.mockResolvedValue(null);
            bcrypt.hash.mockResolvedValue('hashed-password');
            const err = Object.assign(new Error('Email is invalid'), { name: 'ValidationError' });
            User.create.mockRejectedValue(err);

            await signup(mockReq(validSignupBody), res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.render).toHaveBeenCalledWith(
                'auth/signup',
                expect.objectContaining({ error: 'Email is invalid' })
            );
        });

        test('re-renders form with generic message on unexpected DB error', async () => {
            User.findOne.mockResolvedValue(null);
            bcrypt.hash.mockResolvedValue('hashed-password');
            User.create.mockRejectedValue(new Error('DB connection lost'));

            await signup(mockReq(validSignupBody), res);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.render).toHaveBeenCalledWith(
                'auth/signup',
                expect.objectContaining({ error: 'Something went wrong. Please try again.' })
            );
        });
    });
});

describe('login', () => {
    let res;

    beforeEach(() => {
        res = mockRes();
        jest.clearAllMocks();
    });

    test('sets session userId and redirects to /addresses on valid credentials', async () => {
        User.findOne.mockResolvedValue({ _id: { toString: () => 'user-123' }, passwordHash: 'hash' });
        bcrypt.compare.mockResolvedValue(true);

        const req = mockReq({ email: 'leon@test.com', password: 'password123' });
        await login(req, res);

        expect(req.session.userId).toBe('user-123');
        expect(res.redirect).toHaveBeenCalledWith('/addresses');
    });

    test('re-renders form when user is not found', async () => {
        User.findOne.mockResolvedValue(null);

        await login(mockReq({ email: 'unknown@test.com', password: 'password123' }), res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.render).toHaveBeenCalledWith(
            'auth/login',
            expect.objectContaining({ error: 'Incorrect email or password' })
        );
    });

    test('re-renders form when password is wrong', async () => {
        User.findOne.mockResolvedValue({ _id: 'user-123', passwordHash: 'hash' });
        bcrypt.compare.mockResolvedValue(false);

        await login(mockReq({ email: 'leon@test.com', password: 'wrongpassword' }), res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.render).toHaveBeenCalledWith(
            'auth/login',
            expect.objectContaining({ error: 'Incorrect email or password' })
        );
    });

    test('uses identical error message for wrong email and wrong password to prevent user enumeration', async () => {
        User.findOne.mockResolvedValue(null);
        await login(mockReq({ email: 'nobody@test.com', password: 'pass' }), res);
        const wrongEmailError = res.render.mock.calls[0][1].error;

        res = mockRes();
        User.findOne.mockResolvedValue({ _id: 'user-123', passwordHash: 'hash' });
        bcrypt.compare.mockResolvedValue(false);
        await login(mockReq({ email: 'leon@test.com', password: 'wrongpassword' }), res);
        const wrongPasswordError = res.render.mock.calls[0][1].error;

        expect(wrongEmailError).toBe(wrongPasswordError);
    });

    test('normalises email to lowercase and trims whitespace before lookup', async () => {
        User.findOne.mockResolvedValue(null);

        await login(mockReq({ email: '  LEON@TEST.COM  ', password: 'password123' }), res);

        expect(User.findOne).toHaveBeenCalledWith({ email: 'leon@test.com' });
    });

    test('does not throw when password field is absent from request body', async () => {
        User.findOne.mockResolvedValue({ _id: 'user-123', passwordHash: 'hash' });
        bcrypt.compare.mockResolvedValue(false);

        await expect(
            login(mockReq({ email: 'leon@test.com' }), res)
        ).resolves.not.toThrow();
        expect(bcrypt.compare).toHaveBeenCalledWith('', 'hash');
    });

    test('re-renders form with generic message on unexpected DB error', async () => {
        User.findOne.mockRejectedValue(new Error('DB connection lost'));

        await login(mockReq({ email: 'leon@test.com', password: 'password123' }), res);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.render).toHaveBeenCalledWith(
            'auth/login',
            expect.objectContaining({ error: 'Something went wrong. Please try again.' })
        );
    });
});
