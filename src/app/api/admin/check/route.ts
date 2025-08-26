import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerClient();

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required', isAdmin: false },
        { status: 401 }
      );
    }

    // Check if user is admin
    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .select('is_admin, username, display_name')
      .eq('id', user.id)
      .single();

    if (profileError) {
      console.error('Error checking admin status:', profileError);
      return NextResponse.json(
        { error: 'Failed to check admin status', isAdmin: false },
        { status: 500 }
      );
    }

    return NextResponse.json({
      isAdmin: userProfile?.is_admin || false,
      user: {
        id: user.id,
        username: userProfile?.username,
        display_name: userProfile?.display_name,
      },
    });
  } catch (error) {
    console.error('Admin check error:', error);
    return NextResponse.json(
      { error: 'Internal server error', isAdmin: false },
      { status: 500 }
    );
  }
}
