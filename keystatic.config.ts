import { collection, config, fields, singleton } from '@keystatic/core';

export default config({
  // 本地模式：在开发服务器上访问 /keystatic 直接读写本地文件。
  // 如需网页端远程编辑，请阅读 README「远程编辑」章节。
  storage: {
    kind: 'local',
  },
  collections: {
    posts: collection({
      label: '文章',
      slugField: 'title',
      path: 'src/content/posts/*',
      format: { contentField: 'content' },
      entryLayout: 'content',
      schema: {
        title: fields.slug({
          name: { label: '标题' },
          description: '文章标题，同时用于生成 URL。',
        }),
        date: fields.date({
          label: '发布日期',
          defaultValue: { kind: 'today' },
        }),
        excerpt: fields.text({
          label: '摘要',
          multiline: true,
          description: '显示在卡片列表与 RSS 中；留空则自动从正文截取。',
        }),
        cover: fields.image({
          label: '封面图',
          directory: 'public/images/posts',
          publicPath: '/images/posts',
        }),
        tags: fields.array(fields.text({ label: '标签' }), {
          label: '标签',
          itemLabel: (props) => props.value || '标签',
        }),
        draft: fields.checkbox({
          label: '草稿',
          defaultValue: false,
          description: '开启后不会出现在列表与 RSS 中。',
        }),
        content: fields.markdoc({
          label: '正文',
          description: '支持标准 Markdown、代码块与引用。',
          extension: 'md',
        }),
      },
    }),
    chatters: collection({
      label: '说说',
      slugField: 'title',
      path: 'src/content/chatters/*',
      format: { contentField: 'content' },
      entryLayout: 'content',
      schema: {
        title: fields.slug({
          name: { label: '标题' },
          description: '说说标题，同时用于生成 URL。',
        }),
        date: fields.date({
          label: '日期',
          defaultValue: { kind: 'today' },
        }),
        content: fields.markdoc({
          label: '内容',
          description: '短小的碎片记录。',
          extension: 'md',
        }),
      },
    }),
  },
  singletons: {
    siteConfig: singleton({
      label: '站点设置',
      path: 'src/siteConfig.json',
      format: { type: 'json' },
      schema: {
        title: fields.text({ label: '博客名', defaultValue: '我的博客' }),
        bio: fields.text({
          label: '简介',
          multiline: true,
          description: '显示在首页个人名片与页面元信息中。',
        }),
        avatar: fields.image({
          label: '头像',
          directory: 'public/images',
          publicPath: '/images',
        }),
        social: fields.object(
          {
            github: fields.text({ label: 'GitHub 用户名' }),
            email: fields.text({ label: '邮箱' }),
          },
          { label: '社交链接' },
        ),
        themeColors: fields.array(fields.text({ label: '颜色' }), {
          label: '主题色',
          description: '用于背景渐变，可填 2-4 个颜色值（hex/rgb）。',
          itemLabel: (props) => props.value || '颜色',
        }),
        bgImages: fields.array(fields.image({ label: '背景图', directory: 'public/images/bg', publicPath: '/images/bg' }), {
          label: '背景图',
          description: '可选：缓慢轮换的固定背景图片。',
          itemLabel: () => '背景图',
        }),
      },
    }),
  },
});
