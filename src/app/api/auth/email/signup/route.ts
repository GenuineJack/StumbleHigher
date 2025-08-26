import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { z } from 'zod';

// Validation schema for email signup
const EmailSignupSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  username: z.string()
    .min(3, 'Username must be at least 3 characters')
    .max(30, 'Username must be less than 30 characters')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Username can only contain letters, numbers, hyphens, and underscores'),
  display_name: z.string().max(50, 'Display name must be less than 50 characters').optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate request data
    const userData = EmailSignupSchema.parse(body);

    const supabase = createServiceClient();

    // Check if username is already taken
    const { data: existingUsername } = await supabase
      .from('users')
      .select('id')
      .eq('username', userData.username)
      .single();

    if (existingUsername) {
      return NextResponse.json(
        { error: 'Username is already taken' },
        { status: 409 }
      );
    }

    // Check if email is already registered
    const { data: existingEmail } = await supabase
      .from('users')
      .select('id')
      .eq('email', userData.email)
      .single();

    if (existingEmail) {
      return NextResponse.json(
        { error: 'Email is already registered' },
        { status: 409 }
      );
    }

    // Create auth user
    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email: userData.email,
      password: userData.password,
      email_confirm: false, // Require email confirmation
      user_metadata: {
        username: userData.username,
        display_name: userData.display_name,
      }
    });

    if (authError) {
      console.error('Error creating auth user:', authError);

      if (authError.message.includes('already registered')) {
        return NextResponse.json(
          { error: 'Email is already registered' },
          { status: 409 }
        );
      }

      return NextResponse.json(
        { error: 'Failed to create account' },
        { status: 500 }
      );
    }

    // Create user profile
    const { data: newUser, error: profileError } = await supabase
      .from('users')
      .insert({
        id: authUser.user.id,
        email: userData.email,
        username: userData.username,
        display_name: userData.display_name || null,
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
          provider: 'email',
          username: userData.username,
          has_display_name: !!userData.display_name,
        },
      });

    return NextResponse.json({
      user: newUser,
      message: 'Account created successfully. Please check your email to verify your account.',
    }, { status: 201 });

  } catch (error) {
    console.error('Email signup error:', error);

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

export async function GET() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  );
}
