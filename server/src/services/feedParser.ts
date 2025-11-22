import axios from 'axios';
import { parseString } from 'xml2js';
import { promisify } from 'util';
import { FeedConfig } from '../types';

const parseXML = promisify(parseString);

export interface ParsedJob {
  externalId: string;
  title: string;
  description?: string;
  company?: string;
  location?: string;
  category?: string;
  jobType?: string;
  region?: string;
  url?: string;
  feedUrl: string;
  rawData?: any;
}

export async function fetchFeed(feedUrl: string): Promise<any> {
  try {
    const response = await axios.get(feedUrl, {
      timeout: 30000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; JobImportBot/1.0)',
      },
    });
    return response.data;
  } catch (error) {
    throw new Error(`Failed to fetch feed ${feedUrl}: ${error}`);
  }
}

export async function parseXMLFeed(xmlData: string, feedUrl: string): Promise<ParsedJob[]> {
  try {
    // xml2js parseString returns `any` at runtime but is typed as `unknown` via promisify.
    // Narrow the type so we can safely access rss/channel/feed while still allowing
    // different XML shapes.
    const result = (await parseXML(xmlData)) as any;
    const jobs: ParsedJob[] = [];

    // Handle different RSS/XML formats
    const channel = result.rss?.channel?.[0] || result.feed;
    
    if (!channel) {
      throw new Error('Invalid RSS/XML format: no channel or feed element found');
    }

    const items = channel.item || channel.entry || [];

    for (const item of items) {
      try {
        const job = parseJobItem(item, feedUrl);
        if (job) {
          jobs.push(job);
        }
      } catch (error) {
        console.error(`Error parsing job item:`, error);
        // Continue with next item
      }
    }

    return jobs;
  } catch (error) {
    throw new Error(`Failed to parse XML feed: ${error}`);
  }
}

function parseJobItem(item: any, feedUrl: string): ParsedJob | null {
  try {
    // Extract title
    const title = getText(item.title) || getText(item.title?.[0]) || '';
    if (!title) {
      return null;
    }

    // Extract description
    const description = getText(item.description) || 
                       getText(item.summary) || 
                       getText(item.content) ||
                       getText(item.description?.[0]) ||
                       getText(item.summary?.[0]) ||
                       getText(item.content?.[0]) ||
                       '';

    // Extract link/URL
    const url = getText(item.link) || 
                getText(item.link?.[0]) || 
                (Array.isArray(item.link) ? item.link.find((l: any) => l.$.href)?.$.href : item.link?.$.href) ||
                '';

    // Extract GUID/ID
    const guid = getText(item.guid) || 
                 getText(item.id) || 
                 getText(item.guid?.[0]) ||
                 getText(item.id?.[0]) ||
                 url ||
                 '';

    // Extract company/author
    const company = getText(item.company) ||
                    getText(item.author) ||
                    getText(item['dc:creator']) ||
                    getText(item.company?.[0]) ||
                    getText(item.author?.[0]) ||
                    '';

    // Extract location
    const location = getText(item.location) ||
                     getText(item['geo:lat']) ||
                     getText(item.location?.[0]) ||
                     '';

    // Extract category
    const category = getText(item.category) ||
                     getText(item['job_category']) ||
                     (Array.isArray(item.category) ? item.category.map((c: any) => getText(c)).join(', ') : '') ||
                     '';

    // Extract job type
    const jobType = getText(item['job_type']) ||
                    getText(item.type) ||
                    '';

    // Create external ID from feed URL + GUID
    const externalId = `${feedUrl}::${guid}`;

    return {
      externalId,
      title,
      description,
      company,
      location,
      category,
      jobType,
      url,
      feedUrl,
      rawData: item,
    };
  } catch (error) {
    console.error('Error parsing job item:', error);
    return null;
  }
}

function getText(value: any): string {
  if (typeof value === 'string') {
    return value.trim();
  }
  if (value?.[0] && typeof value[0] === 'string') {
    return value[0].trim();
  }
  if (value?._) {
    return String(value._).trim();
  }
  return '';
}

export async function fetchAndParseFeed(feedUrl: string): Promise<ParsedJob[]> {
  const xmlData = await fetchFeed(feedUrl);
  const jobs = await parseXMLFeed(xmlData, feedUrl);
  return jobs;
}
