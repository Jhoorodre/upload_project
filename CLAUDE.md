# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a **Manga Distributed Host** system - a flexible, modular solution for hosting manga/comics across multiple image hosting services. The system provides intelligent distribution strategies, automatic failover, and maintains a centralized JSON index via GitHub.

## Key Features

- **Multi-host support**: Catbox, ImgBB, Imgur with extensible architecture
- **Flexible upload strategies**: single_host, round_robin, redundant, size_based, load_balanced
- **Configuration system**: Hierarchical config (global → chapter → group)
- **GitHub integration**: Automatic index management and version control
- **Progress tracking**: Real-time upload progress and statistics
- **Error handling**: Retry mechanisms and fallback strategies

## Development Commands

```bash
# Install dependencies
npm install

# Run main system
npm start

# Development with auto-reload
npm run dev

# Run tests
npm test

# Run examples
npm run example
node examples/upload-chapter.js
node examples/batch-upload.js
node examples/advanced-config.js
```

## Project Architecture

### Core Components

- **`index.js`**: Main entry point and unified API
- **`config/`**: Configuration management system
  - `FlexibleHostConfig.js`: Hierarchical configuration management
  - `UploadStrategies.js`: Upload strategy implementations
- **`hosts/`**: Image hosting service integrations
  - `BaseUploader.js`: Abstract base class for uploaders
  - `CatboxUploader.js`: Catbox.moe integration
  - `ImgBBUploader.js`: ImgBB API integration
  - `ImgurUploader.js`: Imgur API integration
  - `HostManager.js`: Host coordination and statistics
- **`core/`**: Business logic and orchestration
  - `MangaUploadManager.js`: Upload orchestration and progress tracking
  - `MangaIndexManager.js`: JSON index management
  - `GitHubManager.js`: GitHub API integration
- **`examples/`**: Usage demonstrations and templates

### Data Flow

1. **Configuration Resolution**: `FlexibleHostConfig` resolves config based on chapter/group
2. **Strategy Selection**: `UploadStrategies` determines which hosts to use
3. **Upload Execution**: `MangaUploadManager` coordinates uploads across selected hosts
4. **Index Management**: `MangaIndexManager` updates the centralized JSON index
5. **GitHub Sync**: `GitHubManager` commits changes to repository

### Configuration Hierarchy

Configuration is resolved in order of precedence:
1. **Group-specific** (highest priority)
2. **Chapter-specific** 
3. **Global defaults** (lowest priority)

## Environment Setup

Copy `.env.example` to `.env` and configure:

```bash
# Required
GITHUB_TOKEN=ghp_your_token_here
GITHUB_REPO=manga-index
GITHUB_USERNAME=your_username

# Optional API keys (at least one recommended)
IMGBB_API_KEY=your_imgbb_key
IMGUR_CLIENT_ID=your_imgur_client_id
CATBOX_USER_HASH=your_catbox_hash
```

## Key Patterns

### Adding New Hosts

1. Create new uploader extending `BaseUploader`
2. Implement `upload()` method following error handling patterns
3. Register in `HostManager.setupDefaultHosts()`
4. Add configuration in `FlexibleHostConfig`

### Creating Upload Strategies

```javascript
// Add to UploadStrategies.js
strategies.custom_strategy = (availableHosts, ...args) => {
  // Return array of host names to use
  return ['preferred_host'];
};
```

### Configuration Management

```javascript
// Update configuration dynamically
config.updateConfig('chapters.001', {
  strategy: 'redundant',
  selected_hosts: ['catbox', 'imgbb']
});
```

## Testing

- Use `examples/` for integration testing
- Test connectivity with `hostManager.testConnectivity()`
- Monitor health with `hostManager.getHealthStatus()`
- Check stats with `indexManager.getStats()`

## Common Issues

- **API Rate Limits**: Configure `concurrent_uploads` and `retry_delay`
- **Large Files**: Use `size_based` strategy or configure `max_file_size`
- **GitHub API**: Ensure token has proper repository permissions
- **Host Failures**: Use `redundant` strategy for critical uploads

## Security Considerations

- Never commit API keys to repository
- Use environment variables for sensitive configuration
- Implement proper error handling to avoid exposing credentials
- Consider using GitHub repository secrets for CI/CD

## JSON Index Structure

The system maintains a standardized JSON structure:
```json
{
  "title": "Manga Title",
  "description": "Description",
  "author": "Author Name",
  "artist": "Artist Name",
  "status": "ongoing",
  "chapters": {
    "001": {
      "title": "Chapter Title",
      "volume": "1",
      "groups": {
        "group_name": ["url1", "url2", "url3"]
      }
    }
  }
}
```

## Extension Points

- **New Strategies**: Add to `UploadStrategies.js`
- **New Hosts**: Extend `BaseUploader`
- **Configuration**: Modify `FlexibleHostConfig`
- **Index Format**: Extend `MangaIndexManager`
- **Progress Tracking**: Enhance `MangaUploadManager`