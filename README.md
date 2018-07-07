# Simple Youtube Downloader

**Can download prebuilt binary from release**

This is a Simple Youtube downloader written in electron
 (can download mp3(audio) and mp4(video)) 

**This application deeply depends on [ytdl-core.](https://github.com/fent/node-ytdl-core)**

Use below modules

- `UIKit` - UI framework
- `ytdl-core` - youtube download core module
- `d3.js` - jquery alternate (not data driven ^^;)

## To Use

1. Install
```bash
# Clone this repository
git clone https://github.com/ryuken73/electron-youtube-downloader.git
# Install dependencies
npm install
# Run the app
npm start
```
2. Wait for initial webview loading
![Alt Text](https://github.com/ryuken73/electron-youtube-downloader/blob/master/images/initail_loading.jpg)


3. Search video or audio
![Alt Text](https://github.com/ryuken73/electron-youtube-downloader/blob/master/images/search.jpg)

4. Add media you wand download
- [mp3] for audio only
- [mp4] for video
![Alt Text](https://github.com/ryuken73/electron-youtube-downloader/blob/master/images/add_mp3_mp4.jpg)
  
5. Click Download
![Alt Text](https://github.com/ryuken73/electron-youtube-downloader/blob/master/images/download.jpg)


## License

[CC0 1.0 (Public Domain)](LICENSE.md)
