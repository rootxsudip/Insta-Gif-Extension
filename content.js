function extractGiphyPageUrl(imgUrl) {
  const decoded = decodeURIComponent(imgUrl);

  const match = decoded.match(/\/([A-Za-z0-9]+)\/200\.gif/i);

  if (!match) return null;

  return `https://giphy.com/gifs/${match[1]}`;
}

function collectImages() {
  const images = Array.from(document.images)
    .filter(img => img.src.toLowerCase().includes("giphy.com"))
    .map(img => ({
      src: img.src,
      giphyPage: extractGiphyPageUrl(img.src)
    }))
    .filter(img => img.giphyPage);

  const uniqueImages = Array.from(
    new Map(images.map(img => [img.giphyPage, img])).values()
  );

  chrome.storage.local.set({
    pageImages: uniqueImages,
    lastUpdated: Date.now()
  });
}

// Initial collection on page load
collectImages();

let timeout;

// Watch for DOM changes to update image list in real-time
const observer = new MutationObserver(() => {
  clearTimeout(timeout);
  timeout = setTimeout(collectImages, 300);
});

observer.observe(document.body, {
  childList: true,
  subtree: true
});