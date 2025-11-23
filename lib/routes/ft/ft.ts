import { Route } from '@/types';
import cache from '@/utils/cache';
import got from '@/utils/got';
import parser from '@/utils/rss-parser';
import { load } from 'cheerio';

export const route: Route = {
    path: '/rss',
    categories: ['traditional-media'],
    example: '/ft/rss',
    features: {
        requireConfig: false,
        requirePuppeteer: false,
        antiCrawler: false,
        supportBT: false,
        supportPodcast: false,
        supportScihub: false,
    },
    name: 'FT RSS Feed',
    handler,
};

async function handler(ctx) {
    const ProcessFeed = (content) => {
        content.find('div.o-share, aside, div.o-ads').remove();
        return content.html();
    };

    const link = 'https://www.ft.com/news-feed?format=rss';
    const feed = await parser.parseURL(link);

    const items = await Promise.all(
        feed.items.map((item) =>
            cache.tryGet(item.link, async () => {
                const response = await got({
                    method: 'get',
                    url: item.link,
                    headers: {
                        Referer: 'https://www.facebook.com',
                    },
                });

                const $ = load(response.data);

                item.description = ProcessFeed($('article.js-article__content-body'));
                item.category = [
                    $('.n-content-tag--with-follow').text(),
                    ...$('.article__right-bottom a.concept-list__concept')
                        .toArray()
                        .map((e) => $(e).text().trim()),
                ];
                item.author = $('a.n-content-tag--author')
                    .toArray()
                    .map((e) => ({ name: $(e).text() }));

                return item;
            })
        )
    );

    return {
        title: `FT.com`,
        link,
        description: `FT.com`,
        item: items,
    };
}
