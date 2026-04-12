const gallery = document.getElementById("gallery");

async function fetchGiphyTitle(gifId) {
  try {
    const res = await fetch(
      `https://api.giphy.com/v1/gifs/${gifId}?api_key=zMXVKoebcgwTRkSm1JjLe6dU5aLfxdRY&rating=g`
    );

    const data = await res.json();

    return data.data?.title || "Untitled";
  } catch {
    return "Untitled";
  }
}

function renderImages(images) {
  gallery.innerHTML = "";

  images.forEach(async img => {
    const container = document.createElement("div");
    const gifId = img.giphyPage.split("/").pop();
    const title = await fetchGiphyTitle(gifId);

    container.innerHTML = `
        <div class="gif-item">
            <div class="gif-row">
            <img src="${img.src}">
            <p class="gif-title">${title}</p>
            </div>
            <a href="${img.giphyPage}" target="_blank">${img.giphyPage}</a>
        </div>
    `;

    gallery.appendChild(container);
  });
}

function loadImages() {
  chrome.storage.local.get("pageImages", (data) => {
    renderImages(data.pageImages || []);
  });
}

loadImages();

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "local" && changes.pageImages) {
    renderImages(changes.pageImages.newValue || []);
  }
});