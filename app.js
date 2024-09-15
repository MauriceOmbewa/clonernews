const API_BASE_URL = 'https://hacker-news.firebaseio.com/v0';
const ITEMS_PER_PAGE = 10;
const LIVE_UPDATES_LIMIT = 15;
let currentPage = 0;
let lastItemId = null;
let currentFilter = 'all';
let isLoading = false;
let allLiveUpdates = [];

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

    // Prepend new posts to the list
    const postsList = document.getElementById('posts-list');
    const newPosts = postsList.querySelectorAll('li');
    newPosts.forEach(post => postsList.prepend(post));

    currentPage++;
    isLoading = false;
}

// Fetch and display comments
async function fetchComments(commentIds, parentElement, depth = 0) {
    const comments = await Promise.all(commentIds.map(fetchItem));
    comments.sort((a, b) => b.time - a.time);

    for (const comment of comments) {
        if (comment && comment.text) {
            displayComment(comment, parentElement, depth);
            if (comment.kids) {
                await fetchComments(comment.kids, parentElement, depth + 1);
            }
        }
    }
}

// Display a post
function displayPost(post) {
    const postsList = document.getElementById('posts-list');
    const postElement = document.createElement('li');
    postElement.id = `post-${post.id}`;
    postElement.classList.add(post.type);

    // Determine the title based on post type
    let title = '';
    if (post.type === 'story') {
        title = post.title || 'story';
    } else if (post.type === 'job') {
        title = post.title || 'job';
    } else if (post.type === 'poll') {
        title = post.title || 'poll';
    } else {
        title = post.title || 'Comment';
    }

    // Set innerHTML with the determined title
    postElement.innerHTML = `
        <h3>${title}</h3>
        <p>Type: ${post.type}</p>
        <p>By: ${post.by}</p>
        <p>Score: ${post.score || 'N/A'}</p>
        <p>Comments: ${post.kids ? post.kids.length : 'none'}</p>
    `;

    postElement.addEventListener('click', () => openPostModal(post));
    postsList.appendChild(postElement);
}


// Display a comment
function displayComment(comment, parentElement, depth) {
    const commentElement = document.createElement('div');
    commentElement.classList.add('comment');
    commentElement.classList.add(`nested-comment-${depth}`);

    let parentPostTitle = '';
    if (comment.parent) {
        parentPostTitle = `Parent post: ${getParentPostTitle(comment.parent)}`;
    } else {
        parentPostTitle = `Original post: ${comment.title}`;
    }

    commentElement.innerHTML = `
        <p>${comment.text}</p>
        <p>By: ${comment.by}</p>
        <p>${parentPostTitle}</p>
    `;
    commentElement.addEventListener('click', (e) => {
        e.stopPropagation();
        openPostModal(comment.parent);
    });
    parentElement.appendChild(commentElement);
}

// Add a new function to get the parent post title
async function getParentPostTitle(parentId) {
    const parentPost = await fetchItem(parentId);
    return parentPost.title;
}

// Add a new function to get the parent post title
function getParentPostTitle(parentId) {
    const parentPost = fetchItem(parentId);
    return parentPost.title;
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
        allLiveUpdates = [...newItems, ...allLiveUpdates];
        displayLiveUpdates();
        lastItemId = latestItemId;
    }
}

// Display live updates
function displayLiveUpdates() {
    const liveUpdatesList = document.getElementById('live-updates-list');
    liveUpdatesList.innerHTML = '';
    const updatesToShow = allLiveUpdates.slice(0, LIVE_UPDATES_LIMIT);
    
    updatesToShow.forEach(item => {
        const listItem = document.createElement('li');
        listItem.textContent = `New ${item.type}: ${item.title || 'Comment'}`;
        listItem.addEventListener('click', () => openPostModal(item));
        liveUpdatesList.appendChild(listItem);
    });

    const showMoreButton = document.getElementById('show-more-updates');
    if (allLiveUpdates.length > LIVE_UPDATES_LIMIT) {
        showMoreButton.style.display = 'block';
    } else {
        showMoreButton.style.display = 'none';
    }
}

// Show all live updates
function showAllLiveUpdates() {
    const liveUpdatesList = document.getElementById('live-updates-list');
    liveUpdatesList.innerHTML = '';
    
    allLiveUpdates.forEach(item => {
        const listItem = document.createElement('li');
        listItem.textContent = `New ${item.type}: ${item.title || 'Comment'}`;
        listItem.addEventListener('click', () => openPostModal(item));
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

    // Show more updates button
    document.getElementById('show-more-updates').addEventListener('click', showAllLiveUpdates);
}

// Start the application when the DOM is loaded
document.addEventListener('DOMContentLoaded', init);