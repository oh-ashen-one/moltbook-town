import { CONFIG } from '../config.js';

class MoltbookService {
  constructor() {
    this.baseUrl = CONFIG.MOLTBOOK_API;
    this.agents = [];
    this.posts = [];
    this.conversations = [];

    this.lastFeedFetch = 0;
    this.lastConversationFetch = 0;

    this.feedCacheDuration = 30 * 1000; // 30 seconds
    this.conversationCacheDuration = 10 * 60 * 1000; // 10 minutes
  }

  // Extract unique agents from posts AND comments, calculate karma from upvotes
  extractAgentsFromPosts(posts) {
    const agentMap = new Map();

    for (const post of posts) {
      // Process post author
      if (post.author && post.author.id) {
        const existing = agentMap.get(post.author.id);
        const postUpvotes = post.upvotes || 0;

        if (existing) {
          // Add upvotes to karma total
          existing.karma += postUpvotes;
          // Keep the post with most upvotes as recent
          if (postUpvotes > (existing.recentPost?.upvotes || 0)) {
            existing.recentPost = {
              id: post.id,
              title: post.title || 'Untitled',
              upvotes: postUpvotes
            };
          }
        } else {
          const submoltName = post.submolt?.display_name || post.submolt?.name || 'general';
          const postTitle = post.title || 'Untitled';
          agentMap.set(post.author.id, {
            id: post.author.id,
            name: post.author.name || null,
            karma: postUpvotes,
            avatar: post.author.avatar || post.author.profile_image || post.author.profileImage || post.author.image || null,
            description: `Active in ${submoltName}`,
            activity: `Posting: "${postTitle.substring(0, 40)}${postTitle.length > 40 ? '...' : ''}"`,
            recentPost: {
              id: post.id,
              title: postTitle,
              upvotes: postUpvotes
            }
          });
        }
      }

      // Process comment authors (from _comments attached during fetch)
      if (post._comments && Array.isArray(post._comments)) {
        for (const comment of post._comments) {
          if (comment.author && comment.author.id && !agentMap.has(comment.author.id)) {
            const commentUpvotes = comment.upvotes || 0;
            const commentContent = comment.content || comment.body || '';
            agentMap.set(comment.author.id, {
              id: comment.author.id,
              name: comment.author.name || comment.author.username || null,
              karma: commentUpvotes,
              avatar: comment.author.avatar || comment.author.profile_image || comment.author.profileImage || null,
              description: 'Active commenter',
              activity: `Commenting: "${commentContent.substring(0, 40)}${commentContent.length > 40 ? '...' : ''}"`,
              recentPost: null
            });
          }
        }
      }
    }

    const agents = Array.from(agentMap.values());
    // Shuffle for random selection from recent activity
    for (let i = agents.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [agents[i], agents[j]] = [agents[j], agents[i]];
    }
    return agents;
  }

  async fetchTopAgents(limit = 20) {
    await this.fetchFeed('hot', 100);
    return this.agents.slice(0, limit);
  }

  async fetchFeed(sort = 'new', limit = 20, fetchComments = false) {
    const now = Date.now();

    // Skip cache for large requests (3D view)
    if (limit <= 100 && this.posts.length > 0 && (now - this.lastFeedFetch) < this.feedCacheDuration) {
      return { agents: this.agents, posts: this.posts };
    }

    try {
      // Fetch multiple pages of posts using pagination
      let rawPosts = [];
      let offset = 0;
      const postsPerPage = 50; // API max per request
      const maxPages = 10; // Try up to 10 pages (500 posts)

      for (let page = 0; page < maxPages; page++) {
        try {
          const response = await fetch(`${this.baseUrl}/posts?limit=${postsPerPage}&offset=${offset}`);
          if (!response.ok) {
            console.log(`Page ${page + 1} failed with status ${response.status}, stopping`);
            break;
          }
          const data = await response.json();
          const posts = data.posts || data;
          if (!Array.isArray(posts) || posts.length === 0) {
            console.log(`Page ${page + 1} returned no posts, stopping`);
            break;
          }
          rawPosts.push(...posts);
          console.log(`Fetched page ${page + 1}: ${posts.length} posts (total: ${rawPosts.length})`);
          if (posts.length < postsPerPage) {
            console.log(`Got fewer posts than requested, no more pages`);
            break;
          }
          offset += postsPerPage;
        } catch (e) {
          console.log(`Page ${page + 1} error: ${e.message}, stopping`);
          break;
        }
      }

      console.log(`Total posts fetched: ${rawPosts.length}`);

      if (rawPosts.length === 0) {
        throw new Error('No posts in response');
      }

      // Fetch comments for ALL posts to get more unique agents
      if (fetchComments) {
        const postsToFetchComments = rawPosts; // Check ALL posts
        await Promise.all(postsToFetchComments.map(async (post) => {
          try {
            const postId = post.id || post._id;
            if (!postId) return;
            const commentsRes = await fetch(`${this.baseUrl}/posts/${postId}/comments`);
            if (commentsRes.ok) {
              const commentsData = await commentsRes.json();
              post._comments = Array.isArray(commentsData) ? commentsData : (commentsData.comments || []);
            }
          } catch (e) {
            // Ignore comment fetch errors
          }
        }));
      }

      this.posts = rawPosts.map((post, i) => ({
        id: post.id || post._id || null,
        title: post.title || post.content?.substring(0, 60) || 'Untitled',
        content: post.content || post.body || post.title || '',
        author: post.author ? {
          id: post.author.id || post.author._id,
          name: post.author.name || post.author.username,
          karma: post.author.karma || post.author.score || 0,
          description: post.author.description || post.author.bio || 'A mysterious agent...',
          avatar: post.author.avatar || post.author.profile_image || post.author.profileImage || post.author.image || null
        } : null,
        upvotes: post.upvotes || post.score || post.likes || 0
      }));

      this.agents = this.extractAgentsFromPosts(rawPosts);

      this.lastFeedFetch = now;
      console.log(`Fetched ${this.posts.length} posts, extracted ${this.agents.length} agents from API`);
      return { agents: this.agents, posts: this.posts };
    } catch (error) {
      console.error('Failed to fetch feed:', error.message);
      throw error;
    }
  }

  getRandomPost() {
    if (this.posts.length === 0) return null;
    const post = this.posts[Math.floor(Math.random() * this.posts.length)];
    return { title: post.title, author: post.author };
  }

  async fetchActiveConversations(loadedAgentNames = []) {
    const now = Date.now();
    const agentNameSet = new Set(loadedAgentNames);

    // Skip cache if we have specific agents to check
    if (loadedAgentNames.length === 0 && this.conversations.length > 0 &&
        (now - this.lastConversationFetch) < this.conversationCacheDuration) {
      return this.conversations;
    }

    try {
      // Use cached posts if available, otherwise fetch
      let posts = this.posts;
      if (posts.length === 0) {
        const response = await fetch(`${this.baseUrl}/posts?limit=50`);
        if (!response.ok) throw new Error(`API error: ${response.status}`);
        const data = await response.json();
        posts = data.posts || data;
      }

      if (!Array.isArray(posts) || posts.length === 0) {
        throw new Error('No posts for conversations');
      }

      // Filter to posts where author is a loaded agent
      const relevantPosts = loadedAgentNames.length > 0
        ? posts.filter(p => p.author?.name && agentNameSet.has(p.author.name))
        : posts;

      console.log(`Checking ${relevantPosts.length} posts for conversations among ${loadedAgentNames.length} agents`);

      this.conversations = [];

      // Check up to 20 posts for interactions
      for (let i = 0; i < Math.min(20, relevantPosts.length); i++) {
        const post = relevantPosts[i];
        if (i > 0 && i % 5 === 0) await new Promise(r => setTimeout(r, 200));

        try {
          const postId = post.id || post._id;
          const commentsRes = await fetch(`${this.baseUrl}/posts/${postId}/comments`);
          if (commentsRes.ok) {
            const commentsData = await commentsRes.json();
            const comments = commentsData.comments || commentsData;

            if (comments && comments.length >= 1) {
              // Use agent NAMES instead of IDs
              const participantNames = [...new Set([
                post.author?.name,
                ...comments.map(c => c.author?.name)
              ])].filter(name => name && (loadedAgentNames.length === 0 || agentNameSet.has(name)));

              if (participantNames.length >= 2) {
                this.conversations.push({
                  id: `conv-${postId}`,
                  postId,
                  agentNames: participantNames, // Use names not IDs
                  topic: (post.title || 'Discussion').substring(0, 35)
                });
              }
            }
          }
        } catch (e) {
          // Skip failed comment fetch
        }
      }

      console.log(`Found ${this.conversations.length} conversations with loaded agents`);

      if (this.conversations.length === 0) {
        throw new Error('No conversations found');
      }

      this.lastConversationFetch = now;
      return this.conversations;
    } catch (error) {
      console.error('Failed to fetch conversations:', error.message);
      throw error;
    }
  }

  getRandomConversation() {
    if (this.conversations.length === 0) return null;
    return this.conversations[Math.floor(Math.random() * this.conversations.length)];
  }

  // Fetch full agent profile including owner Twitter info
  async fetchAgentProfile(agentName) {
    try {
      const response = await fetch(`${this.baseUrl}/agents/profile?name=${encodeURIComponent(agentName)}`);
      if (!response.ok) return null;
      const data = await response.json();
      
      if (data.success && data.agent) {
        return {
          ...data.agent,
          owner: data.agent.owner || null,
          recentPosts: data.recentPosts || []
        };
      }
      return null;
    } catch (error) {
      console.error('Failed to fetch agent profile:', error.message);
      return null;
    }
  }

  async searchAgentByName(username) {
    const searchName = username.toLowerCase();

    try {
      // Try to find in cached agents first
      const cached = this.agents.find(a =>
        a.name.toLowerCase() === searchName
      );
      if (cached) return cached;

      // Fetch posts to search for the agent
      const response = await fetch(`${this.baseUrl}/posts?limit=100`);
      if (!response.ok) throw new Error(`API error: ${response.status}`);
      const data = await response.json();
      const allPosts = data.posts || data;

      // Search through all fetched posts (exact match first, then partial)
      let match = allPosts.find(p =>
        p.author && p.author.name && p.author.name.toLowerCase() === searchName
      );

      // If no exact match, try partial match
      if (!match) {
        match = allPosts.find(p =>
          p.author && p.author.name && p.author.name.toLowerCase().includes(searchName)
        );
      }

      if (match && match.author) {
        return {
          id: match.author.id || match.author._id,
          name: match.author.name,
          karma: match.author.karma || 0,
          description: match.author.description || match.author.bio || 'A mysterious molty...',
          recentPost: { id: match.id, title: match.title, upvotes: match.upvotes || 0 }
        };
      }

      return null;
    } catch (error) {
      console.error('Failed to search agent:', error.message);
      return null;
    }
  }

  clearCache() {
    this.lastFeedFetch = 0;
    this.lastConversationFetch = 0;
  }

  getRecentPosters(limit = 10) {
    return this.agents.slice(0, limit).map(a => a.name);
  }

  // Build relationship graph from conversations
  // Returns edges: [{ source, target, weight, topics }]
  buildRelationshipGraph(agents, conversations) {
    const edgeMap = new Map(); // "source|target" -> edge
    const loadedAgentNames = new Set(agents.map(a => a.name));

    for (const conv of conversations) {
      // Use agentNames if available, fallback to agentIds for backwards compat
      let names = conv.agentNames || [];

      // If using old format with agentIds, try to map them
      if (names.length === 0 && conv.agentIds) {
        const idToName = new Map();
        agents.forEach(a => idToName.set(a.id, a.name));
        names = conv.agentIds
          .map(id => idToName.get(id))
          .filter(Boolean);
      }

      // Filter to only loaded agents
      names = names.filter(name => loadedAgentNames.has(name));

      if (names.length < 2) continue;

      // Create edges between all participants (fully connected)
      for (let i = 0; i < names.length; i++) {
        for (let j = i + 1; j < names.length; j++) {
          // Normalize edge key (alphabetical order)
          const [a, b] = [names[i], names[j]].sort();
          const key = `${a}|${b}`;

          if (edgeMap.has(key)) {
            const edge = edgeMap.get(key);
            edge.weight++;
            if (!edge.topics.includes(conv.topic)) {
              edge.topics.push(conv.topic);
            }
          } else {
            edgeMap.set(key, {
              source: a,
              target: b,
              weight: 1,
              topics: [conv.topic]
            });
          }
        }
      }
    }

    return Array.from(edgeMap.values());
  }

  // Fetch ALL recent activity from Moltbook (not filtered by loaded agents)
  // Returns: [{ commenter, postAuthor, postTitle, postId, content, timestamp, type }]
  async fetchAllRecentActivity(sinceTimestamp = null, limit = 100) {
    const recentActivity = [];

    try {
      // Fetch recent posts (ALL posts, sorted by newest first, with cache-bust)
      const response = await fetch(`${this.baseUrl}/posts?limit=100&sort=new&_t=${Date.now()}`);
      if (!response.ok) return [];
      const data = await response.json();
      const posts = data.posts || data;

      // Add posts as activity
      for (const post of posts) {
        if (!post.author?.name) continue;

        const timestamp = post.created_at || post.createdAt || null;

        // Skip if older than sinceTimestamp
        if (sinceTimestamp && timestamp) {
          const postTime = new Date(timestamp).getTime();
          if (postTime <= sinceTimestamp) continue;
        }

        recentActivity.push({
          commenter: post.author.name,
          postAuthor: post.author.name,
          postTitle: post.title || 'Untitled',
          postId: post.id || post._id,
          content: post.title || post.content?.substring(0, 100) || '',
          timestamp: timestamp || new Date().toISOString(),
          type: 'post'
        });
      }

      // Note: Comments endpoint returns 405, so we only show posts for now

      // Sort by timestamp (newest first)
      recentActivity.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

      // Dedupe by unique key
      const seen = new Set();
      const deduped = recentActivity.filter(a => {
        const key = `${a.postId}-${a.commenter}-${a.type}-${a.content.substring(0, 20)}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

      return deduped.slice(0, limit);
    } catch (error) {
      console.error('Failed to fetch recent activity:', error);
      return [];
    }
  }

  // Fetch recent activity for live feed (filtered to loaded agents)
  // Returns: [{ commenter, postAuthor, postTitle, postId, content, timestamp, type }]
  async fetchRecentComments(loadedAgentNames = [], limit = 10) {
    const agentNameSet = new Set(loadedAgentNames);
    const recentActivity = [];

    try {
      // Fetch recent posts
      const response = await fetch(`${this.baseUrl}/posts?limit=30`);
      if (!response.ok) return [];
      const data = await response.json();
      const posts = data.posts || data;

      // First, add posts by loaded agents as activity
      for (const post of posts) {
        if (post.author?.name && agentNameSet.has(post.author.name)) {
          recentActivity.push({
            commenter: post.author.name,
            postAuthor: post.author.name,
            postTitle: post.title || 'Untitled',
            postId: post.id || post._id,
            content: post.title || post.content?.substring(0, 100) || '',
            timestamp: post.created_at || post.createdAt || new Date().toISOString(),
            type: 'post'
          });
        }
        if (recentActivity.length >= limit) break;
      }

      // Then check for comments (where commenter OR post author is loaded)
      const postsToCheck = posts.slice(0, 10);
      for (const post of postsToCheck) {
        try {
          const postId = post.id || post._id;
          const commentsRes = await fetch(`${this.baseUrl}/posts/${postId}/comments`);
          if (!commentsRes.ok) continue;

          const commentsData = await commentsRes.json();
          const comments = commentsData.comments || commentsData;

          if (Array.isArray(comments)) {
            for (const c of comments) {
              const commenterIsLoaded = c.author?.name && agentNameSet.has(c.author.name);
              const authorIsLoaded = post.author?.name && agentNameSet.has(post.author.name);

              // Include if either participant is a loaded agent
              if (commenterIsLoaded || authorIsLoaded) {
                recentActivity.push({
                  commenter: c.author?.name || 'Someone',
                  postAuthor: post.author?.name || 'Someone',
                  postTitle: post.title || 'Untitled',
                  postId: postId,
                  content: (c.content || '').substring(0, 100),
                  timestamp: c.created_at || c.createdAt || new Date().toISOString(),
                  type: 'comment'
                });
              }
            }
          }
        } catch (e) {
          // Skip failed fetch
        }

        if (recentActivity.length >= limit * 2) break;
      }

      // Sort by timestamp (newest first) and dedupe
      recentActivity.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

      // Dedupe by postId + commenter
      const seen = new Set();
      const deduped = recentActivity.filter(a => {
        const key = `${a.postId}-${a.commenter}-${a.type}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

      return deduped.slice(0, limit);
    } catch (error) {
      console.error('Failed to fetch recent comments:', error);
      return [];
    }
  }

  // Fetch random comments for the chat sidebars
  async fetchRandomComments(limit = 500) {
    try {
      console.log('Fetching real Moltbook comments...');

      // Get posts from API (fetch 100 posts for variety)
      const response = await fetch(`${this.baseUrl}/posts?limit=100`);
      if (!response.ok) throw new Error(`API error: ${response.status}`);
      const data = await response.json();
      const posts = data.posts || data;

      const allComments = [];
      const seenContent = new Set();

      // Fetch comments from many posts (30+ for good variety)
      const postsToFetch = Math.min(40, posts.length);

      for (let i = 0; i < postsToFetch; i++) {
        const post = posts[i];
        // Small delay to avoid rate limiting
        if (i > 0 && i % 5 === 0) await new Promise(r => setTimeout(r, 200));

        try {
          const postId = post.id || post._id;
          const commentsRes = await fetch(`${this.baseUrl}/posts/${postId}/comments`);
          if (commentsRes.ok) {
            const commentsData = await commentsRes.json();
            const comments = commentsData.comments || commentsData;

            if (Array.isArray(comments)) {
              comments.forEach(c => {
                if (c.content && c.author?.name) {
                  // Skip duplicates by content
                  const contentKey = c.content.substring(0, 50).toLowerCase();
                  if (!seenContent.has(contentKey)) {
                    seenContent.add(contentKey);
                    allComments.push({
                      id: c.id || c._id,
                      content: c.content.substring(0, 200),
                      author: c.author.name,
                      postTitle: post.title?.substring(0, 30) || 'a post'
                    });
                  }
                }
              });
            }
          }
        } catch (e) {
          // Skip failed fetch
        }

        // Stop early if we have enough
        if (allComments.length >= limit) break;
      }

      console.log(`Fetched ${allComments.length} unique comments from Moltbook`);

      // Shuffle and return
      return allComments.sort(() => Math.random() - 0.5).slice(0, limit);
    } catch (error) {
      console.error('Failed to fetch comments:', error.message);
      return [];
    }
  }
}

export const moltbookService = new MoltbookService();
