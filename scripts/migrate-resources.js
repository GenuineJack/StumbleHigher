const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Category mapping
const CATEGORY_MAPPING = {
  // Default to 'books' for most content, but try to detect based on URL/title
  'youtube.com': 'videos',
  'youtu.be': 'videos',
  'vimeo.com': 'videos',
  'ted.com': 'videos',
  'tools': 'tools',
  'app': 'tools',
  'software': 'tools',
  'research': 'research',
  'paper': 'research',
  'study': 'research',
  'academic': 'research',
  'philosophy': 'philosophy',
  'article': 'articles',
  'blog': 'articles',
  'essay': 'articles',
};

// Tag mapping based on content
const TAG_MAPPING = {
  'creative': ['creative', 'art', 'design'],
  'business': ['business', 'entrepreneurship'],
  'technology': ['technology', 'programming'],
  'psychology': ['psychology', 'mindset'],
  'productivity': ['productivity', 'habits'],
  'leadership': ['leadership', 'management'],
  'philosophy': ['philosophy', 'wisdom'],
  'science': ['science', 'research'],
  'education': ['educational', 'learning'],
  'inspiring': ['inspiring', 'motivational'],
  'practical': ['practical', 'actionable'],
  'deep': ['deep', 'thoughtful'],
};

function categorizeResource(resource) {
  const title = (resource.title || '').toLowerCase();
  const author = (resource.author || '').toLowerCase();
  const url = (resource.link || resource.url || '').toLowerCase();

  // Check URL patterns first
  for (const [pattern, category] of Object.entries(CATEGORY_MAPPING)) {
    if (url.includes(pattern)) {
      return category;
    }
  }

  // Check title/author patterns
  if (title.includes('video') || title.includes('talk') || title.includes('documentary')) {
    return 'videos';
  }

  if (title.includes('tool') || title.includes('app') || title.includes('software')) {
    return 'tools';
  }

  if (title.includes('research') || title.includes('study') || title.includes('paper')) {
    return 'research';
  }

  if (title.includes('article') || title.includes('essay') || url.includes('blog')) {
    return 'articles';
  }

  if (title.includes('philosophy') || author.includes('philosopher')) {
    return 'philosophy';
  }

  // Default to books
  return 'books';
}

function generateTags(resource) {
  const title = (resource.title || '').toLowerCase();
  const author = (resource.author || '').toLowerCase();
  const description = (resource.description || '').toLowerCase();
  const content = `${title} ${author} ${description}`;

  const tags = [];

  // Check for tag patterns
  for (const [pattern, tagList] of Object.entries(TAG_MAPPING)) {
    if (content.includes(pattern)) {
      tags.push(...tagList);
    }
  }

  // Add some default tags based on category
  const category = categorizeResource(resource);
  switch (category) {
    case 'videos':
      tags.push('visual', 'engaging');
      break;
    case 'tools':
      tags.push('practical', 'useful');
      break;
    case 'research':
      tags.push('deep', 'academic');
      break;
    case 'philosophy':
      tags.push('thoughtful', 'wisdom');
      break;
    case 'books':
      tags.push('educational', 'comprehensive');
      break;
    case 'articles':
      tags.push('insightful', 'thought-provoking');
      break;
  }

  // Remove duplicates and limit to 5 tags
  return [...new Set(tags)].slice(0, 5);
}

function estimateReadingTime(resource) {
  const title = (resource.title || '').toLowerCase();
  const url = (resource.link || resource.url || '').toLowerCase();

  if (url.includes('youtube.com') || url.includes('youtu.be') || url.includes('vimeo')) {
    // Video content - estimate based on typical video lengths
    return Math.floor(Math.random() * 45) + 15; // 15-60 minutes
  }

  if (title.includes('book') || title.includes('guide') || title.includes('handbook')) {
    // Books/long content
    return Math.floor(Math.random() * 300) + 120; // 2-5 hours
  }

  if (title.includes('article') || title.includes('essay') || title.includes('blog')) {
    // Articles
    return Math.floor(Math.random() * 20) + 5; // 5-25 minutes
  }

  if (title.includes('tool') || title.includes('app')) {
    // Tools - time to explore
    return Math.floor(Math.random() * 30) + 10; // 10-40 minutes
  }

  // Default estimate
  return Math.floor(Math.random() * 60) + 15; // 15-75 minutes
}

function getDifficultyLevel(resource) {
  const title = (resource.title || '').toLowerCase();
  const author = (resource.author || '').toLowerCase();
  const content = `${title} ${author}`;

  // Advanced indicators
  if (content.includes('advanced') ||
      content.includes('expert') ||
      content.includes('master') ||
      content.includes('academic') ||
      content.includes('research') ||
      content.includes('complex')) {
    return 'advanced';
  }

  // Beginner indicators
  if (content.includes('beginner') ||
      content.includes('intro') ||
      content.includes('start') ||
      content.includes('basics') ||
      content.includes('simple') ||
      content.includes('easy')) {
    return 'beginner';
  }

  // Default to intermediate
  return 'intermediate';
}

async function createGenesisMark() {
  // Create a special "genesis" user for imported content
  const { data: genesisUser, error: userError } = await supabase
    .from('users')
    .upsert({
      id: '00000000-0000-0000-0000-000000000000',
      username: 'genesis',
      display_name: 'Genesis Collection',
      bio: 'Original curated collection of higher content',
      is_genesis: true,
      reputation_score: 1000,
    })
    .select()
    .single();

  if (userError) {
    console.error('❌ Error creating genesis user:', userError);
    return null;
  }

  return genesisUser.id;
}

async function migrateResources() {
  try {
    console.log('🚀 Starting resource migration...');

    // Load resources.json
    let resourcesPath = path.join(__dirname, '..', 'data', 'resources.json');
    if (!fs.existsSync(resourcesPath)) {
      // Fallback to old location
      resourcesPath = path.join(__dirname, '..', 'resources.json');
      if (!fs.existsSync(resourcesPath)) {
        console.error('❌ resources.json not found in data/ or root directory');
        return;
      }
    }

    const resourcesData = JSON.parse(fs.readFileSync(resourcesPath, 'utf8'));
    console.log(`📄 Found ${resourcesData.length} resources to migrate`);

    // Create genesis user
    const genesisUserId = await createGenesisMark();
    if (!genesisUserId) {
      console.error('❌ Failed to create genesis user');
      return;
    }

    // Process resources in batches
    const batchSize = 50;
    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < resourcesData.length; i += batchSize) {
      const batch = resourcesData.slice(i, i + batchSize);

      console.log(`📦 Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(resourcesData.length / batchSize)}`);

      const processedBatch = batch.map((resource, index) => {
        const url = resource.link || resource.url || resource.author;

        if (!url || !resource.title) {
          console.warn(`⚠️  Skipping resource ${i + index + 1}: missing title or URL`);
          return null;
        }

        const category = categorizeResource(resource);
        const tags = generateTags(resource);
        const estimatedTime = estimateReadingTime(resource);
        const difficulty = getDifficultyLevel(resource);

        return {
          title: resource.title.trim(),
          author: resource.author?.trim() || null,
          url: url.trim(),
          description: resource.description?.trim() || null,
          category,
          tags,
          difficulty_level: difficulty,
          estimated_time_minutes: estimatedTime,
          submitted_by: genesisUserId,
          status: 'approved', // Genesis content is pre-approved
          is_genesis: true,
          quality_score: 5.0, // High quality score for curated content
          trending_score: Math.random() * 3 + 2, // Random trending score between 2-5
          views: Math.floor(Math.random() * 1000), // Random view count
          unique_viewers: Math.floor(Math.random() * 500),
        };
      }).filter(Boolean);

      if (processedBatch.length === 0) {
        continue;
      }

      // Insert batch
      const { data, error } = await supabase
        .from('resources')
        .insert(processedBatch)
        .select('id, title');

      if (error) {
        console.error(`❌ Error inserting batch:`, error);
        errorCount += processedBatch.length;
      } else {
        console.log(`✅ Inserted ${data.length} resources`);
        successCount += data.length;
      }

      // Small delay between batches
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log('\n📊 Migration Summary:');
    console.log(`✅ Successfully migrated: ${successCount} resources`);
    console.log(`❌ Failed: ${errorCount} resources`);
    console.log(`📈 Total processed: ${successCount + errorCount} resources`);

    // Update genesis user with submission count
    await supabase
      .from('users')
      .update({
        total_submissions: successCount,
        updated_at: new Date().toISOString(),
      })
      .eq('id', genesisUserId);

    console.log('\n🎉 Migration completed successfully!');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run migration if called directly
if (require.main === module) {
  migrateResources()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('❌ Unhandled error:', error);
      process.exit(1);
    });
}

module.exports = { migrateResources };
