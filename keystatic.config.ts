import { collection, config, fields, singleton } from '@keystatic/core';

export default config({
  locale: 'zh-CN',
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
          name: { label: '标题', description: '文章标题，同时用于生成 URL。' },
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
        pinned: fields.checkbox({
          label: '置顶',
          defaultValue: false,
          description: '开启后文章排在列表与归档的最前面。',
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
          name: { label: '标题', description: '说说标题，同时用于生成 URL。' },
        }),
        date: fields.date({
          label: '日期',
          defaultValue: { kind: 'today' },
        }),
        draft: fields.checkbox({
          label: '草稿',
          defaultValue: false,
          description: '开启后不会出现在首页与说说页。',
        }),
        content: fields.markdoc({
          label: '内容',
          description: '短小的碎片记录。',
          extension: 'md',
        }),
      },
    }),
    songs: collection({
      label: '歌曲',
      slugField: 'title',
      path: 'src/content/songs/*',
      format: { data: 'json' },
      schema: {
        title: fields.slug({
          name: { label: '歌名', description: '歌名，同时用于生成 URL。' },
        }),
        artist: fields.text({ label: '歌手/艺术家' }),
        playlist: fields.text({
          label: '歌单/风格',
          description: '例如：电子、日语、纯音乐……同名歌曲会自动归入同一个歌单。',
        }),
        cover: fields.image({
          label: '封面',
          directory: 'public/music/covers',
          publicPath: '/music/covers',
        }),
        audio: fields.file({
          label: '音频文件',
          directory: 'public/music/audio',
          publicPath: '/music/audio',
          description: '支持 mp3 / flac / m4a / ogg / wav；后台上传上限 15MB（更大文件用 npm run music:import 批量导入）。',
        }),
        lyrics: fields.file({
          label: '歌词字幕',
          directory: 'public/music/lyrics',
          publicPath: '/music/lyrics',
          description: '推荐 .lrc（逐行同步），也支持纯文本 .txt（静态展示）。',
        }),
        lyricsText: fields.text({
          label: '歌词文本（LRC）',
          multiline: true,
          description: '可直接粘贴/编辑 LRC 歌词；与「歌词字幕」文件二选一，歌词文件优先。',
        }),
        rating: fields.select({
          label: '评分',
          options: [
            { label: '未评分', value: '' },
            { label: '1 星', value: '1' },
            { label: '2 星', value: '2' },
            { label: '3 星', value: '3' },
            { label: '4 星', value: '4' },
            { label: '5 星', value: '5' },
          ],
          defaultValue: '',
        }),
        draft: fields.checkbox({
          label: '草稿',
          defaultValue: false,
          description: '开启后不会出现在音乐页。',
        }),
        review: fields.text({
          label: '乐评',
          multiline: true,
          description: '你对这首歌的短评。',
        }),
      },
    }),
    friends: collection({
      label: '友链',
      slugField: 'name',
      path: 'src/content/friends/*',
      format: { data: 'json' },
      schema: {
        name: fields.slug({
          name: { label: '昵称', description: '友链名称，同时用于生成 URL。' },
        }),
        url: fields.url({ label: '网站链接' }),
        avatar: fields.image({
          label: '头像',
          directory: 'public/images/friends',
          publicPath: '/images/friends',
        }),
        description: fields.text({
          label: '简介',
          multiline: true,
        }),
        draft: fields.checkbox({
          label: '草稿',
          defaultValue: false,
        }),
      },
    }),
    photos: collection({
      label: '照片墙',
      slugField: 'caption',
      path: 'src/content/photos/*',
      format: { data: 'json' },
      schema: {
        caption: fields.slug({
          name: { label: '说明', description: '照片说明，同时用于生成 URL。' },
        }),
        image: fields.image({
          label: '图片',
          directory: 'public/images/photos',
          publicPath: '/images/photos',
        }),
        date: fields.date({
          label: '日期',
          defaultValue: { kind: 'today' },
        }),
        draft: fields.checkbox({
          label: '草稿',
          defaultValue: false,
        }),
      },
    }),
  },
  singletons: {
    siteConfig: singleton({
      label: '站点设置',
      // 注意：不能带 .json 扩展名，否则 Keystatic 会追加扩展名写成 siteConfig.json.json
      path: 'src/siteConfig',
      format: { data: 'json' },
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
        wallpaper: fields.image({
          label: '主页壁纸',
          directory: 'public/images/wallpapers',
          publicPath: '/images/wallpapers',
          description: '可选：固定背景图片，叠加在光晕之上。',
        }),
        wallpaperOpacity: fields.select({
          label: '壁纸不透明度',
          options: [
            { label: '10%', value: '0.1' },
            { label: '25%', value: '0.25' },
            { label: '40%', value: '0.4' },
            { label: '60%', value: '0.6' },
            { label: '80%', value: '0.8' },
            { label: '100%', value: '1' },
          ],
          defaultValue: '0.4',
        }),
        enableParticles: fields.checkbox({
          label: '粒子特效',
          defaultValue: true,
          description: '关闭后隐藏背景漂浮光点，滚动更省性能。',
        }),
        enableAurora: fields.checkbox({
          label: '光晕特效',
          defaultValue: true,
          description: '关闭后隐藏背景流动光晕。',
        }),
        featuredPosts: fields.array(
          fields.relationship({ label: '选择文章', collection: 'posts' }),
          {
            label: '主页展示的文章',
            description: '按顺序选择首页「灵感与作品」展示的文章；留空则自动取最新文章。',
            itemLabel: (props) => props.value || '选择文章',
          },
        ),
        featuredSongs: fields.array(
          fields.relationship({ label: '选择歌曲', collection: 'songs' }),
          {
            label: '主页展示的歌曲',
            description: '选择首页「音乐」板块展示的歌曲；留空则自动取全部已发布歌曲。',
            itemLabel: (props) => props.value || '选择歌曲',
          },
        ),
        playerSongs: fields.array(
          fields.relationship({ label: '选择歌曲', collection: 'songs' }),
          {
            label: '播放器自定义播放列表',
            description: '逐首指定主页播放器的播放顺序；优先于下方歌单，留空则按歌单/全部播放。',
            itemLabel: (props) => props.value || '选择歌曲',
          },
        ),
        playerPlaylist: fields.text({
          label: '播放器默认歌单',
          description: '只填歌单名（如 日语、电子），主页播放器只播这个歌单；留空则播放全部歌曲。',
        }),
        goatcounterSite: fields.text({
          label: 'GoatCounter 站点 ID',
          description: '可选：填入后启用访问统计（https://www.goatcounter.com），例如 my-blog。',
        }),
        bgImages: fields.array(fields.image({ label: '背景图', directory: 'public/images/bg', publicPath: '/images/bg' }), {
          label: '背景图',
          description: '可选：缓慢轮换的固定背景图片。',
          itemLabel: () => '背景图',
        }),
      },
    }),
    about: singleton({
      label: '关于我',
      path: 'src/content/about',
      format: { contentField: 'content' },
      entryLayout: 'content',
      schema: {
        title: fields.text({ label: '标题', defaultValue: '关于我' }),
        content: fields.markdoc({
          label: '内容',
          description: '自我介绍、经历、联系方式等，支持 Markdown。',
          extension: 'md',
        }),
      },
    }),
  },
});
