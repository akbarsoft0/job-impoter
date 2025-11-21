import { parseXMLFeed } from '../services/feedParser';

describe('Feed Parser', () => {
  const mockFeedUrl = 'https://example.com/feed';

  it('should parse RSS feed correctly', async () => {
    const xmlData = `<?xml version="1.0"?>
      <rss version="2.0">
        <channel>
          <title>Test Feed</title>
          <item>
            <title>Software Engineer</title>
            <description>Great job opportunity</description>
            <link>https://example.com/job/1</link>
            <guid>job-1</guid>
            <author>Tech Company</author>
          </item>
        </channel>
      </rss>`;

    const jobs = await parseXMLFeed(xmlData, mockFeedUrl);

    expect(jobs).toHaveLength(1);
    expect(jobs[0].title).toBe('Software Engineer');
    expect(jobs[0].externalId).toBe(`${mockFeedUrl}::job-1`);
    expect(jobs[0].description).toBe('Great job opportunity');
  });
});
