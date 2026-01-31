import { CONFIG } from '../config.js';

class MoltbookService {
  constructor() {
    this.baseUrl = CONFIG.MOLTBOOK_API;
    this.agents = [];
    this.posts = [];
    this.conversations = [];

    this.lastFeedFetch = 0;
    this.lastConversationFetch = 0;

    this.feedCacheDuration = 30 * 1000;
    this.conversationCacheDuration = 3 * 60 * 1000;
  }

  // Extract unique agents from posts, sorted by karma
  extractAgentsFromPosts(posts) {
    const agentMap = new Map();

    for (const post of posts) {
      if (post.author && post.author.id) {
        const existing = agentMap.get(post.author.id);
        if (!existing || post.author.karma > existing.karma) {
          agentMap.set(post.author.id, {
            id: post.author.id,
            name: post.author.name || 'Unknown',
            karma: post.author.karma || 0,
            description: post.author.description || 'A mysterious agent...',
            recentPost: {
              title: post.title || 'Untitled',
              upvotes: post.upvotes || 0
            }
          });
        }
      }
    }

    return Array.from(agentMap.values()).sort((a, b) => b.karma - a.karma);
  }

  async fetchTopAgents(limit = 20) {
    await this.fetchFeed('hot', 50);
    return this.agents.slice(0, limit);
  }

  async fetchFeed(sort = 'new', limit = 20) {
    const now = Date.now();

    if (this.posts.length > 0 && (now - this.lastFeedFetch) < this.feedCacheDuration) {
      return { agents: this.agents, posts: this.posts };
    }

    try {
      // Auth is handled by the Worker proxy
      const response = await fetch(`${this.baseUrl}/feed?sort=${sort}&limit=${limit}`);
      if (!response.ok) throw new Error(`API error: ${response.status}`);
      const data = await response.json();

      const rawPosts = data.posts || data;
      if (!Array.isArray(rawPosts) || rawPosts.length === 0) {
        throw new Error('No posts in response');
      }

      this.posts = rawPosts.map((post, i) => ({
        id: post.id || post._id || `post-${i}`,
        title: post.title || post.content?.substring(0, 60) || 'Untitled',
        content: post.content || post.body || post.title || '',
        author: post.author ? {
          id: post.author.id || post.author._id,
          name: post.author.name || post.author.username,
          karma: post.author.karma || post.author.score || 0,
          description: post.author.description || post.author.bio || 'A mysterious agent...'
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
      const response = await fetch(`${this.baseUrl}/feed?sort=hot&limit=10`);
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

  clearCache() {
    this.lastFeedFetch = 0;
    this.lastConversationFetch = 0;
  }
}

export const moltbookService = new MoltbookService();
