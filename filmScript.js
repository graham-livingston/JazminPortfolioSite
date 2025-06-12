// Film Details Class Implementation
class FilmDetails {
    constructor(filmData) {
        this.data = filmData || {};
    }

    // Private helper to safely access nested properties
    #get(path) {
        return path.split('.').reduce((obj, key) =>
            (obj && obj[key] !== undefined) ? obj[key] : null
            , this.data);
    }

    // Private helper to check if section has content
    #hasContent(section) {
        return this.#get(section) !== null &&
            this.#get(section) !== undefined &&
            (!Array.isArray(this.#get(section)) || this.#get(section).length > 0);
    }

    // Build the poster section
    #buildPoster() {
        const poster = this.#get('poster');
        return poster ? `
            <section class="film-poster">
                <img src="${poster}" alt="${this.#get('title')} Poster">
            </section>
        ` : '';
    }

    // Build the header section
    #buildHeader() {
        const title = this.#get('title');
        const year = this.#get('year');
        const location = this.#get('location');
        const duration = this.#get('duration');

        return `
            <header class="film-header">
                ${title ? `<h1>${title}</h1>` : ''}
                <div class="film-meta">
                    ${year || location ? `
                        <p class="film-info">
                            ${year ? `<span class="year">${year}</span>` : ''}
                            ${year && location ? ' | ' : ''}
                            ${location ? `<span class="location">${location}</span>` : ''}
                        </p>
                    ` : ''}
                    ${duration ? `<p class="duration">${duration}</p>` : ''}
                </div>
            </header>
        `;
    }

    // Build the description section
    #buildDescription() {
        const description = this.#get('description') || this.#get('shortDescription');
        return description ? `
            <section class="film-description">
                <p>${description}</p>
            </section>
        ` : '';
    }

    // Build the cast section
    #buildCast() {
        const cast = this.#get('cast');
        return cast && cast.length > 0 ? `
            <section class="film-cast">
                <h2>Cast</h2>
                <ul>
                    ${cast.map(member => `
                        <li>${member.name}${member.role ? ` - ${member.role}` : ''}</li>
                    `).join('')}
                </ul>
            </section>
        ` : '';
    }

    // Build the crew section
    #buildCrew() {
        const crew = this.#get('crew');
        return crew && crew.length > 0 ? `
            <section class="film-crew">
                <ul>
                    ${crew.map(member => `
                        <li>${member.role} - ${member.name}</li>
                    `).join('')}
                </ul>
            </section>
        ` : '';
    }

    // Build the awards section
    #buildAwards() {
        const awards = this.#get('awards');
        return awards && awards.length > 0 ? `
            <section class="film-awards">
                <h2>Awards</h2>
                <ul>
                    ${awards.map(award => `
                        <li>
                            ${award.name}
                            ${award.year ? ` (${award.year})` : ''}
                            ${award.organization ? ` - ${award.organization}` : ''}
                        </li>
                    `).join('')}
                </ul>
            </section>
        ` : '';
    }

    // Build the gallery section
    #buildGallery() {
        const stillsPath = this.#get('stills');
        if (!stillsPath) return '';

        return `
            <div id="gallery-container" class="gallery-container">
                <div class="gallery-resize-handle"></div>
                <div class="gallery-content">
                    <div class="gallery-images" id="gallery-images">
                        <!-- Images will be loaded dynamically via JavaScript -->
                    </div>
                </div>
            </div>
        `;
    }

    // Build the trailer section
    #buildTrailer() {
        const trailer = this.#get('trailer');
        return trailer ? `
            <section class="film-trailer">
                <div class="trailer-container">
                    <iframe 
                        src="https://player.vimeo.com/video/${trailer}?title=0&byline=0&portrait=0&logo=0&playbar=0&volume=1&settings=1&fullscreen=1" 
                        frameborder="0" 
                        webkitallowfullscreen 
                        mozallowfullscreen 
                        allowfullscreen 
                        title="${this.#get('title')} - Trailer">
                    </iframe>
                </div>
            </section>
        ` : '';
    }

    // Main render method
    render() {
        return `
            <article class="film-details">
                <div class="film-layout">
                    ${this.#buildPoster()}
                    <div class="film-content">
                        ${this.#buildHeader()}
                        ${this.#buildDescription()}
                        ${this.#buildCast()}
                        ${this.#buildCrew()}
                        ${this.#buildAwards()}
                    </div>
                </div>
                ${this.#buildGallery()}
                ${this.#buildTrailer()}
            </article>
        `;
    }
}

// Existing navigation function
function buildNavigation(films) {
    return `
        <nav class="navigation">
            <li><a href="./about.html">About</a></li>
            <li><a href="./credits.html">Credits</a></li>
            <li><a href="./reel.html">Reel</a></li>
            <li class="dropdown">
                <a href="/films">Films</a>
                <ul class="dropdown-menu">
                    ${Object.keys(films).map(url => `
                        <li><a href="./${url}.html">${films[url].title}</a></li>
                    `).join('')}
                </ul>
            </li>
        </nav>
    `;
}

// Helper function to get current page title
function getPageTitle() {
    const url = window.location.pathname;
    const page = url.split("/").pop();
    return page.replace(/\.html$/, "");
}
