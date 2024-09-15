const API_BASE_URL = 'https://hacker-news.firebaseio.com/v0';
const ITEMS_PER_PAGE = 10;
let currentPage = 0;
let lastItemId = null;
let currentFilter = 'all';
let isLoading = false;

// Throttle function to limit API requests
function throttle(func, limit) {
    let inThrottle;
    return function() {
        const args = arguments;
        const context = this;
        if (!inThrottle) {
            func.apply(context, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    }
}

// Fetch item details
async function fetchItem(id) {
    const response = await fetch(`${API_BASE_URL}/item/${id}.json`);
    return await response.json();
}

// Fetch latest item ID
async function fetchLatestItemId() {
    const response = await fetch(`${API_BASE_URL}/maxitem.json`);
    return await response.json();
}

// Fetch and display posts
async function fetchPosts() {
    if (isLoading) return;
    isLoading = true;

    if (!lastItemId) {
        lastItemId = await fetchLatestItemId();
    }

    const startId = lastItemId - (currentPage * ITEMS_PER_PAGE);
    const endId = Math.max(startId - ITEMS_PER_PAGE + 1, 1);

    for (let id = startId; id >= endId; id--) {
        const item = await fetchItem(id);
        if (item && (currentFilter === 'all' || item.type === currentFilter)) {
            displayPost(item);
        }
    }

    currentPage++;
    isLoading = false;
}

// Fetch and display comments
async function fetchComments(commentIds, parentElement) {
    const comments = await Promise.all(commentIds.map(fetchItem));
    comments.sort((a, b) => b.time - a.time);

    for (const comment of comments) {
        if (comment && comment.text) {
            displayComment(comment, parentElement);
            if (comment.kids) {
                await fetchComments(comment.kids, parentElement);
            }
        }
    }
}

// Display a post
function displayPost(post) {
    const postsList = document.getElementById('posts-list');
    const postElement = document.createElement('li');
    postElement.id = `post-${post.id}`;
    postElement.innerHTML = `
        <h3>${post.title || 'Comment'}</h3>
        <p>Type: ${post.type}</p>
        <p>By: ${post.by}</p>
        <p>Score: ${post.score || 'N/A'}</p>
    `;
    postElement.addEventListener('click', () => openPostModal(post));
    postsList.appendChild(postElement);
}

// Display a comment
function displayComment(comment, parentElement) {
    const commentElement = document.createElement('div');
    commentElement.classList.add('comment');
    commentElement.innerHTML = `
        <p>${comment.text}</p>
        <p>By: ${comment.by}</p>
    `;
    commentElement.addEventListener('click', (e) => {
        e.stopPropagation();
        openPostModal(comment.parent);
    });
    parentElement.appendChild(commentElement);
}

// Open post modal
async function openPostModal(postIdOrPost) {
    const post = typeof postIdOrPost === 'object' ? postIdOrPost : await fetchItem(postIdOrPost);
    const modal = document.getElementById('modal');
    const modalContent = document.getElementById('modal-post-content');
    modalContent.innerHTML = `
        <h2>${post.title || 'Comment'}</h2>
        <p>Type: ${post.type}</p>
        <p>By: ${post.by}</p>
        <p>Score: ${post.score || 'N/A'}</p>
        ${post.url ? `<p><a href="${post.url}" target="_blank">Read more</a></p>` : ''}
        ${post.text ? `<p>${post.text}</p>` : ''}
        <h3>Comments:</h3>
    `;
    if (post.kids) {
        await fetchComments(post.kids, modalContent);
    } else {
        modalContent.innerHTML += '<p>No comments yet.</p>';
    }
    modal.style.display = 'block';
}

// Update live data
async function updateLiveData() {
    const latestItemId = await fetchLatestItemId();
    if (latestItemId > lastItemId) {
        const newItems = [];
        for (let id = latestItemId; id > lastItemId; id--) {
            const item = await fetchItem(id);
            if (item && (currentFilter === 'all' || item.type === currentFilter)) {
                newItems.push(item);
            }
        }
        displayLiveUpdates(newItems);
        lastItemId = latestItemId;
    }
}

// Display live updates
function displayLiveUpdates(items) {
    const liveUpdatesList = document.getElementById('live-updates-list');
    items.forEach(item => {
        const listItem = document.createElement('li');
        listItem.textContent = `New ${item.type}: ${item.title || 'Comment'}`;
        listItem.addEventListener('click', () => openPostModal(item));
        liveUpdatesList.prepend(listItem);
    });
}

// Initialize the application
function init() {
    fetchPosts();
    setInterval(throttle(updateLiveData, 5000), 5000);

    // Infinite scroll
    window.addEventListener('scroll', () => {
        if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 500) {
            fetchPosts();
        }
    });

    // Filter buttons
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            currentFilter = e.target.dataset.type;
            document.getElementById('posts-list').innerHTML = '';
            currentPage = 0;
            lastItemId = null;
            fetchPosts();
        });
    });

    // Close modal
    document.querySelector('.close').addEventListener('click', () => {
        document.getElementById('modal').style.display = 'none';
    });

    window.addEventListener('click', (e) => {
        if (e.target === document.getElementById('modal')) {
            document.getElementById('modal').style.display = 'none';
        }
    });
}

// Start the application when the DOM is loaded
document.addEventListener('DOMContentLoaded', init);
