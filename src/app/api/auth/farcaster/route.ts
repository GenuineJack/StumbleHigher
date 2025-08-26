import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { FarcasterAuthData } from '@/lib/auth';
import { z } from 'zod';

// Validation schema for Farcaster auth data
const FarcasterAuthSchema = z.object({
  fid: z.number(),
  username: z.string(),
  displayName: z.string(),
  pfpUrl: z.string().url(),
  bio: z.string().optional(),
  verifications: z.array(z.string()),
  signature: z.string(),
  message: z.string(),
  nonce: z.string(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate request data
    const authData = FarcasterAuthSchema.parse(body);

    // Verify Farcaster signature (this would be more robust in production)
    const isValidSignature = await verifyFarcasterSignature(authData);
    if (!isValidSignature) {
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      );
    }

    const supabase = createServiceClient();

    // Check if user exists with this Farcaster ID
    const { data: existingUser } = await supabase
      .from('users')
      .select('*')
      .eq('farcaster_id', authData.fid.toString())
      .single();

    if (existingUser) {
      // Update existing user's data
      const { data: updatedUser, error: updateError } = await supabase
        .from('users')
        .update({
          farcaster_username: authData.username,
          display_name: authData.displayName,
          avatar_url: authData.pfpUrl,
          bio: authData.bio || existingUser.bio,
          last_active_at: new Date().toISOString(),
        })
        .eq('id', existingUser.id)
        .select()
        .single();

      if (updateError) {
        console.error('Error updating user:', updateError);
        return NextResponse.json(
          { error: 'Failed to update user' },
          { status: 500 }
        );
      }

      // Create or update auth user
      const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
        email: `${authData.username}@farcaster.local`,
        email_confirm: true,
        user_metadata: {
          farcaster_id: authData.fid.toString(),
          username: authData.username,
          display_name: authData.displayName,
          avatar_url: authData.pfpUrl,
        }
      });

      if (authError && authError.message !== 'User already registered') {
        console.error('Error creating auth user:', authError);
      }

      return NextResponse.json({
        user: updatedUser,
        isNewUser: false,
      });
    } else {
      // Create new user
      const userId = crypto.randomUUID();

      // Create auth user first
      const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
        email: `${authData.username}@farcaster.local`,
        email_confirm: true,
        user_metadata: {
          farcaster_id: authData.fid.toString(),
          username: authData.username,
          display_name: authData.displayName,
          avatar_url: authData.pfpUrl,
        }
      });

      if (authError) {
        console.error('Error creating auth user:', authError);
        return NextResponse.json(
          { error: 'Failed to create authentication' },
          { status: 500 }
        );
      }

      // Create user profile
      const { data: newUser, error: profileError } = await supabase
        .from('users')
        .insert({
          id: authUser.user.id,
          farcaster_id: authData.fid.toString(),
          farcaster_username: authData.username,
          username: authData.username,
          display_name: authData.displayName,
          avatar_url: authData.pfpUrl,
          bio: authData.bio,
          eth_address: authData.verifications[0] || null, // First verification is usually ETH address
        })
        .select()
        .single();

      if (profileError) {
        console.error('Error creating user profile:', profileError);
        // Clean up auth user if profile creation fails
        await supabase.auth.admin.deleteUser(authUser.user.id);
        return NextResponse.json(
          { error: 'Failed to create user profile' },
          { status: 500 }
        );
      }

      // Create default user preferences
      await supabase
        .from('user_preferences')
        .insert({
          user_id: newUser.id,
          preferred_categories: [],
          excluded_categories: [],
          preferred_difficulty: 'intermediate',
          max_time_minutes: 60,
          discovery_algorithm: 'balanced',
        });

      // Track analytics event
      await supabase
        .from('analytics_events')
        .insert({
          event_type: 'user_signup',
          user_id: newUser.id,
          properties: {
            provider: 'farcaster',
            fid: authData.fid,
            username: authData.username,
          },
        });

      return NextResponse.json({
        user: newUser,
        isNewUser: true,
      });
    }
  } catch (error) {
    console.error('Farcaster auth error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Verify Farcaster signature
async function verifyFarcasterSignature(authData: FarcasterAuthData): Promise<boolean> {
  try {
    // In production, this would:
    // 1. Fetch the user's custody address from Farcaster Hub
    // 2. Reconstruct the signed message format
    // 3. Verify the signature against the custody address
    // 4. Check nonce to prevent replay attacks

    // For now, we'll do basic validation
    if (!authData.signature || !authData.message || !authData.nonce) {
      return false;
    }

    // Check message format (should contain domain, URI, nonce, etc.)
    const requiredFields = ['domain', 'uri', 'nonce', 'issued-at'];
    const hasRequiredFields = requiredFields.every(field =>
      authData.message.includes(field)
    );

    if (!hasRequiredFields) {
      return false;
    }

    // Verify nonce is recent (within last 10 minutes)
    const messageLines = authData.message.split('\n');
    const issuedAtLine = messageLines.find(line => line.startsWith('Issued At:'));
    if (issuedAtLine) {
      const issuedAt = new Date(issuedAtLine.split(': ')[1]);
      const now = new Date();
      const tenMinutesAgo = new Date(now.getTime() - 10 * 60 * 1000);

      if (issuedAt < tenMinutesAgo) {
        return false; // Message too old
      }
    }

    // TODO: Implement actual cryptographic signature verification
    // This would involve calling Farcaster Hub API to get custody address
    // and verifying the signature using web3 libraries

    return true; // Temporary - assume valid for development
  } catch (error) {
    console.error('Error verifying Farcaster signature:', error);
    return false;
  }
}

export async function GET() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  );
}
