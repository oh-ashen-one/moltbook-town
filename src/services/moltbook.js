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

  // Extract unique agents from posts, calculate karma from upvotes
  extractAgentsFromPosts(posts) {
    const agentMap = new Map();

    for (const post of posts) {
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
          agentMap.set(post.author.id, {
            id: post.author.id,
            name: post.author.name || null,
            karma: postUpvotes,
            avatar: post.author.avatar || post.author.profile_image || post.author.profileImage || post.author.image || null,
            description: `Active in ${post.submolt?.display_name || post.submolt?.name || 'general'}`,
            recentPost: {
              id: post.id,
              title: post.title || 'Untitled',
              upvotes: postUpvotes
            }
          });
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

  async fetchFeed(sort = 'new', limit = 20) {
    const now = Date.now();

    if (this.posts.length > 0 && (now - this.lastFeedFetch) < this.feedCacheDuration) {
      return { agents: this.agents, posts: this.posts };
    }

    try {
      // Public API - no auth needed
      const response = await fetch(`${this.baseUrl}/posts?limit=${limit}`);
      if (!response.ok) throw new Error(`API error: ${response.status}`);
      const data = await response.json();

      const rawPosts = data.posts || data;
      if (!Array.isArray(rawPosts) || rawPosts.length === 0) {
        throw new Error('No posts in response');
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

  async fetchActiveConversations() {
    const now = Date.now();

    if (this.conversations.length > 0 && (now - this.lastConversationFetch) < this.conversationCacheDuration) {
      return this.conversations;
    }

    try {
      const response = await fetch(`${this.baseUrl}/posts?limit=10`);
      if (!response.ok) throw new Error(`API error: ${response.status}`);
      const data = await response.json();
      const posts = data.posts || data;

      if (!Array.isArray(posts) || posts.length === 0) {
        throw new Error('No posts for conversations');
      }

      this.conversations = [];

      for (let i = 0; i < Math.min(3, posts.length); i++) {
        const post = posts[i];
        if (i > 0) await new Promise(r => setTimeout(r, 500));

        try {
          const postId = post.id || post._id;
          const commentsRes = await fetch(`${this.baseUrl}/posts/${postId}/comments`);
          if (commentsRes.ok) {
            const commentsData = await commentsRes.json();
            const comments = commentsData.comments || commentsData;

            if (comments && comments.length >= 1) {
              const agentIds = [...new Set([
                post.author?.id || post.author?._id,
                ...comments.map(c => c.author?.id || c.author?._id)
              ])].filter(Boolean).slice(0, 4);

              if (agentIds.length >= 2) {
                this.conversations.push({
                  id: `conv-${postId}`,
                  postId,
                  agentIds,
                  topic: (post.title || 'Discussion').substring(0, 35)
                });
              }
            }
          }
        } catch (e) {
          // Skip failed comment fetch
        }
      }

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

  // Fetch random comments for the chat sidebars
  async fetchRandomComments(limit = 50) {
    try {
      // Get comments from multiple random posts
      const response = await fetch(`${this.baseUrl}/posts?limit=20`);
      if (!response.ok) throw new Error(`API error: ${response.status}`);
      const data = await response.json();
      const posts = data.posts || data;

      const allComments = [];

      // Fetch comments from a few posts (with rate limiting)
      for (let i = 0; i < Math.min(5, posts.length); i++) {
        const post = posts[i];
        if (i > 0) await new Promise(r => setTimeout(r, 300));

        try {
          const postId = post.id || post._id;
          const commentsRes = await fetch(`${this.baseUrl}/posts/${postId}/comments`);
          if (commentsRes.ok) {
            const commentsData = await commentsRes.json();
            const comments = commentsData.comments || commentsData;

            if (Array.isArray(comments)) {
              comments.forEach(c => {
                if (c.content && c.author?.name) {
                  allComments.push({
                    id: c.id || c._id,
                    content: c.content.substring(0, 150),
                    author: c.author.name,
                    postTitle: post.title?.substring(0, 30) || 'a post'
                  });
                }
              });
            }
          }
        } catch (e) {
          // Skip failed fetch
        }
      }

      // Shuffle and return
      return allComments.sort(() => Math.random() - 0.5).slice(0, limit);
    } catch (error) {
      console.error('Failed to fetch comments:', error.message);
      return [];
    }
  }
}

export const moltbookService = new MoltbookService();
