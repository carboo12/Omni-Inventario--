import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BusinessGuard } from './business-guard';
import * as appSettingsActions from './actions/app-settings';

// Mock the external dependencies
vi.mock('./actions/app-settings', () => ({
    getBusinessMode: vi.fn()
}));

describe('BusinessGuard', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('isPharmacyMode', () => {
        it('returns true when mode is PHARMACY', async () => {
            vi.mocked(appSettingsActions.getBusinessMode).mockResolvedValue('PHARMACY');
            const result = await BusinessGuard.isPharmacyMode();
            expect(result).toBe(true);
        });

        it('returns false when mode is JEWELRY', async () => {
            vi.mocked(appSettingsActions.getBusinessMode).mockResolvedValue('JEWELRY');
            const result = await BusinessGuard.isPharmacyMode();
            expect(result).toBe(false);
        });
    });

    describe('isJewelryMode', () => {
        it('returns true when mode is JEWELRY', async () => {
            vi.mocked(appSettingsActions.getBusinessMode).mockResolvedValue('JEWELRY');
            const result = await BusinessGuard.isJewelryMode();
            expect(result).toBe(true);
        });
    });

    describe('assertMode', () => {
        it('does not throw when the actual mode matches the required mode', async () => {
            vi.mocked(appSettingsActions.getBusinessMode).mockResolvedValue('JEWELRY');
            await expect(BusinessGuard.assertMode('JEWELRY')).resolves.not.toThrow();
        });

        it('throws ValidationError when the actual mode does not match the required mode', async () => {
            vi.mocked(appSettingsActions.getBusinessMode).mockResolvedValue('PHARMACY');
            await expect(BusinessGuard.assertMode('JEWELRY')).rejects.toThrow('This action is only available in JEWELRY mode. Current mode: PHARMACY');
        });
    });
});
