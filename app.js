const API_BASE_URL = 'https://hacker-news.firebaseio.com/v0';
const ITEMS_PER_PAGE = 10;
const LIVE_UPDATES_LIMIT = 15;
let currentPage = 0;
let currentFilter = 'story';
let isLoading = false;
let allLiveUpdates = [];
let currentItems = [];

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

// Fetch items based on current filter
async function fetchItems() {
    let endpoint;
    switch (currentFilter) {
        case 'story':
            endpoint = `${API_BASE_URL}/showstories.json`;
            break;
        case 'job':
            endpoint = `${API_BASE_URL}/jobstories.json`;
            break;
        case 'poll':
            endpoint = `${API_BASE_URL}/pollstories.json`;
            break;
    }
    const response = await fetch(endpoint);
    return await response.json();
}

async function fetchPosts() {
    if (isLoading) return;
    isLoading = true;

    if (currentItems.length === 0) {
        currentItems = await fetchItems();
    }

    const postsList = document.getElementById('posts-list');
    const startIndex = currentPage * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    const itemsToFetch = currentItems.slice(startIndex, endIndex);

    const posts = await Promise.all(itemsToFetch.map(fetchItem));
    posts.sort((a, b) => b.time - a.time);

    for (const post of posts) {
        displayPost(post);
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
        }
    }
}

// Display a post
function displayPost(post) {
    const postsList = document.getElementById('posts-list');
    const postElement = document.createElement('li');
    postElement.id = `post-${post.id}`;
    postElement.classList.add(post.type);

    let title = post.title || post.type;
    const formattedTime = formatTimestamp(post.time);

    postElement.innerHTML = `
        <h3>${title}</h3>
        <p>Type: ${post.type}</p>
        <p>By: ${post.by || 'Anonymous'}</p>
        <p>Score: ${post.score || 'N/A'}</p>
        <p>Posted: ${formattedTime}</p>
        ${post.url ? `<p><a href="${post.url}" target="_blank">Read more</a></p>` : ''}
        ${post.text ? `<p>${post.text}</p>` : ''}
        <div class="comments-container"></div>
    `;

    if (post.kids) {
        const commentsContainer = postElement.querySelector('.comments-container');
        fetchComments(post.kids, commentsContainer);
    }

    postsList.appendChild(postElement);
}

// Display a comment
function displayComment(comment, parentElement) {
    const commentElement = document.createElement('div');
    commentElement.classList.add('comment');

    const formattedTime = formatTimestamp(comment.time);

    commentElement.innerHTML = `
        <p>${comment.text}</p>
        <p>By: ${comment.by || 'Anonymous'}</p>
        <p>Posted: ${formattedTime}</p>
    `;

    if (comment.kids) {
        const subCommentsContainer = document.createElement('div');
        subCommentsContainer.classList.add('sub-comments-container');
        commentElement.appendChild(subCommentsContainer);
        fetchComments(comment.kids, subCommentsContainer);
    }

    parentElement.appendChild(commentElement);
}

// Format timestamp
function formatTimestamp(timestamp) {
    return new Date(timestamp * 1000).toLocaleString();
}

// Update live data
async function updateLiveData() {
    const latestItems = await fetchItems();
    const newItems = latestItems.filter(id => !currentItems.includes(id));
    
    if (newItems.length > 0) {
        const newPosts = await Promise.all(newItems.map(fetchItem));
        allLiveUpdates = [...newPosts, ...allLiveUpdates];
        displayLiveUpdates();
        currentItems = latestItems;
    }
}

// Display live updates
function displayLiveUpdates() {
    const liveUpdatesList = document.getElementById('live-updates-list');
    liveUpdatesList.innerHTML = '';
    const updatesToShow = allLiveUpdates.slice(0, LIVE_UPDATES_LIMIT);
    
    updatesToShow.forEach(item => {
        const listItem = document.createElement('li');
        listItem.textContent = `New ${item.type}: ${item.title || 'Item'}`;
        listItem.addEventListener('click', () => {
            displayPost(item);
            document.getElementById('posts-list').prepend(document.getElementById(`post-${item.id}`));
        });
        liveUpdatesList.appendChild(listItem);
    });

    const showMoreButton = document.getElementById('show-more-updates');
    showMoreButton.style.display = allLiveUpdates.length > LIVE_UPDATES_LIMIT ? 'block' : 'none';
}

// Show all live updates
function showAllLiveUpdates() {
    const liveUpdatesList = document.getElementById('live-updates-list');
    liveUpdatesList.innerHTML = '';
    
    allLiveUpdates.forEach(item => {
        const listItem = document.createElement('li');
        listItem.textContent = `New ${item.type}: ${item.title || 'Item'}`;
        listItem.addEventListener('click', () => {
            displayPost(item);
            document.getElementById('posts-list').prepend(document.getElementById(`post-${item.id}`));
        });
        liveUpdatesList.appendChild(listItem);
    });

    document.getElementById('show-more-updates').style.display = 'none';
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
            currentItems = [];
            fetchPosts();
        });
    });

    // Show more updates button
    document.getElementById('show-more-updates').addEventListener('click', showAllLiveUpdates);
}

// Start the application when the DOM is loaded
document.addEventListener('DOMContentLoaded', init);