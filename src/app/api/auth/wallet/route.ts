import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { SiweMessage } from 'siwe';
import { z } from 'zod';

// Validation schema for wallet auth data
const WalletAuthSchema = z.object({
  message: z.string(),
  signature: z.string(),
  address: z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid Ethereum address'),
  chainId: z.number(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate request data
    const authData = WalletAuthSchema.parse(body);

    // Verify SIWE message
    const siweMessage = new SiweMessage(authData.message);
    const verificationResult = await siweMessage.verify({
      signature: authData.signature,
    });

    if (!verificationResult.success) {
      return NextResponse.json(
        { error: 'Invalid signature', details: verificationResult.error },
        { status: 401 }
      );
    }

    // Additional validations
    if (siweMessage.address.toLowerCase() !== authData.address.toLowerCase()) {
      return NextResponse.json(
        { error: 'Address mismatch' },
        { status: 401 }
      );
    }

    // Check if message is not too old (within 10 minutes)
    if (siweMessage.issuedAt) {
      const issuedAt = new Date(siweMessage.issuedAt);
      const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);

      if (issuedAt < tenMinutesAgo) {
        return NextResponse.json(
          { error: 'Message expired' },
          { status: 401 }
        );
      }
    }

    const supabase = createServiceClient();
    const normalizedAddress = authData.address.toLowerCase();

    // Check if user exists with this address
    const { data: existingUser } = await supabase
      .from('users')
      .select('*')
      .eq('eth_address', normalizedAddress)
      .single();

    if (existingUser) {
      // Update existing user's last active time
      const { data: updatedUser, error: updateError } = await supabase
        .from('users')
        .update({
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
        email: `${normalizedAddress}@wallet.local`,
        email_confirm: true,
        user_metadata: {
          eth_address: normalizedAddress,
          username: existingUser.username,
          display_name: existingUser.display_name,
          avatar_url: existingUser.avatar_url,
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
      const shortAddress = authData.address.slice(0, 8);
      const username = `user_${shortAddress}`;

      // Check if username already exists
      let finalUsername = username;
      let counter = 1;
      while (true) {
        const { data: existingUsername } = await supabase
          .from('users')
          .select('id')
          .eq('username', finalUsername)
          .single();

        if (!existingUsername) break;

        finalUsername = `${username}_${counter}`;
        counter++;
      }

      // Create auth user first
      const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
        email: `${normalizedAddress}@wallet.local`,
        email_confirm: true,
        user_metadata: {
          eth_address: normalizedAddress,
          username: finalUsername,
          display_name: `User ${shortAddress}`,
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
          eth_address: normalizedAddress,
          username: finalUsername,
          display_name: `User ${shortAddress}`,
          avatar_url: generateAvatarUrl(authData.address), // Generate deterministic avatar
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
            provider: 'wallet',
            address: normalizedAddress,
            chain_id: authData.chainId,
          },
        });

      return NextResponse.json({
        user: newUser,
        isNewUser: true,
      });
    }
  } catch (error) {
    console.error('Wallet auth error:', error);

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

// Generate nonce for SIWE message
export async function GET() {
  try {
    const nonce = generateNonce();

    return NextResponse.json({
      nonce,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(), // 10 minutes
    });
  } catch (error) {
    console.error('Error generating nonce:', error);
    return NextResponse.json(
      { error: 'Failed to generate nonce' },
      { status: 500 }
    );
  }
}

// Generate deterministic avatar URL based on address
function generateAvatarUrl(address: string): string {
  // Use a deterministic avatar service like DiceBear or Identicon
  const seed = address.toLowerCase();
  return `https://api.dicebear.com/7.x/identicon/svg?seed=${seed}&backgroundColor=FF6D0E&size=128`;
}

// Generate cryptographically secure nonce
function generateNonce(): string {
  // Generate 32 random bytes and convert to hex
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
}

// Link wallet to existing account
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, ...authData } = body;

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID required' },
        { status: 400 }
      );
    }

    // Validate auth data
    const validatedAuthData = WalletAuthSchema.parse(authData);

    // Verify SIWE message
    const siweMessage = new SiweMessage(validatedAuthData.message);
    const verificationResult = await siweMessage.verify({
      signature: validatedAuthData.signature,
    });

    if (!verificationResult.success) {
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      );
    }

    const supabase = createServiceClient();
    const normalizedAddress = validatedAuthData.address.toLowerCase();

    // Check if address is already linked to another account
    const { data: existingLink } = await supabase
      .from('users')
      .select('id')
      .eq('eth_address', normalizedAddress)
      .neq('id', userId)
      .single();

    if (existingLink) {
      return NextResponse.json(
        { error: 'Address already linked to another account' },
        { status: 409 }
      );
    }

    // Link address to user account
    const { data: updatedUser, error: updateError } = await supabase
      .from('users')
      .update({
        eth_address: normalizedAddress,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)
      .select()
      .single();

    if (updateError) {
      console.error('Error linking wallet:', updateError);
      return NextResponse.json(
        { error: 'Failed to link wallet' },
        { status: 500 }
      );
    }

    // Track analytics event
    await supabase
      .from('analytics_events')
      .insert({
        event_type: 'wallet_linked',
        user_id: userId,
        properties: {
          address: normalizedAddress,
          chain_id: validatedAuthData.chainId,
        },
      });

    return NextResponse.json({
      user: updatedUser,
      message: 'Wallet linked successfully',
    });
  } catch (error) {
    console.error('Wallet linking error:', error);

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
