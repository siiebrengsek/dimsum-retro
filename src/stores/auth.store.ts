import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import type { User } from '@supabase/supabase-js';

type Profile = {
    id: string;
    role: 'admin_warehouse' | 'cashier' | string;
    username?: string;
    email?: string;
    nama?: string;
    outlet?: string;
};

type AuthState = {
    user: User | null;
    profile: Profile | null;
    isLoading: boolean;
    error: string | null;

    signIn: (username: string, password: string, expectedRole?: string) => Promise<void>;
    signUp: (data: { username: string; email: string; password: string; role: string }) => Promise<void>;
    signOut: () => Promise<void>;
    initialize: () => Promise<void>;
};

const profileFromMeta = (user: User): Profile | null => {
    const meta = user.user_metadata || {};
    const role = meta.role || meta.user_role;
    if (role === 'admin_warehouse' || role === 'staf') {
        return { id: user.id, role, username: meta.username, email: user.email, nama: meta.nama };
    }
    return null;
};

export const useAuthStore = create<AuthState>((set) => ({
    user: null,
    profile: null,
    isLoading: true,
    error: null,

    signIn: async (input, password, expectedRole) => {
        set({ isLoading: true, error: null });
        try {
            let email = input;

            if (!input.includes('@')) {
                const { data: emailData, error: lookupError } = await supabase
                    .rpc('lookup_email_by_username', { lookup_username: input });

                if (lookupError || !emailData) {
                    throw new Error('Username tidak ditemukan.');
                }
                email = emailData;
            }

            const { data: { user }, error: signInError } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (signInError) throw signInError;
            if (!user) throw new Error('User not found');

            let profile: Profile | null = null;
            const { data: dbProfile } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', user.id)
                .maybeSingle();

            if (dbProfile?.role === 'admin_warehouse' || dbProfile?.role === 'staf') {
                profile = dbProfile;
            } else {
                profile = profileFromMeta(user);
            }

            if (!profile) {
                await supabase.auth.signOut();
                throw new Error('Profil tidak ditemukan.');
            }

            if (expectedRole && profile.role !== expectedRole) {
                await supabase.auth.signOut();
                throw new Error(`Akses Ditolak: Anda bukan ${expectedRole === 'admin_warehouse' ? 'Admin' : 'Staf'}.`);
            }

            set({ user, profile, isLoading: false });
        } catch (error: any) {
            set({ error: error.message, isLoading: false, user: null, profile: null });
        }
    },

    signUp: async ({ username, email, password, role }) => {
        set({ isLoading: true, error: null });
        try {
            const { data: { user }, error: signUpError } = await supabase.auth.signUp({
                email,
                password,
                options: { data: { username, role, nama: username } },
            });

            if (signUpError) throw signUpError;
            if (!user) throw new Error('Gagal membuat akun.');

            // Try RPC insert (bypasses RLS) — silent if unavailable
            await supabase.rpc('insert_profile', {
                p_id: user.id, p_role: role, p_username: username, p_email: email,
            }).catch(() =>
                // Fallback: direct insert (needs RLS policy) — silent if fails too
                supabase.from('profiles').insert({ id: user.id, role }).catch(() => { })
            );

            let profile: Profile | null = null;
            const { data: dbProfile } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', user.id)
                .maybeSingle();

            if (dbProfile?.role === 'admin_warehouse' || dbProfile?.role === 'staf') {
                profile = dbProfile;
            } else {
                profile = profileFromMeta(user);
            }

            set({ user, profile: profile || { id: user.id, role, username, email, nama: username }, isLoading: false });
        } catch (error: any) {
            set({ error: error.message, isLoading: false });
        }
    },

    signOut: async () => {
        await supabase.auth.signOut();
        set({ user: null, profile: null, error: null });
    },

    initialize: async () => {
        try {
            const { data: { session } } = await supabase.auth.getSession();

            if (session?.user) {
                const { data: dbProfile } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', session.user.id)
                    .maybeSingle();

                const profile = dbProfile?.role === 'admin_warehouse' || dbProfile?.role === 'staf'
                    ? dbProfile
                    : profileFromMeta(session.user);

                if (profile) {
                    set({ user: session.user, profile });
                } else {
                    await supabase.auth.signOut();
                }
            }
        } finally {
            set({ isLoading: false });
        }
    },
}));
