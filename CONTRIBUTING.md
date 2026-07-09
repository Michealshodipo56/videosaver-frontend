# Contributing to VideoSaver Frontend

We love your input! We want to make contributing to VideoSaver as easy and transparent as possible, whether it's:

- Reporting a bug
- Discussing the current state of the code
- Submitting a fix
- Proposing new features
- Becoming a maintainer

## Development Process

We use GitHub to sync code to GitHub, so all code changes happen through pull requests.

1. Fork the repo and create your branch from `main`.
2. If you've added code that should be tested, add tests.
3. If you've changed APIs, update the documentation.
4. Ensure the test suite passes.
5. Make sure your code lints.
6. Issue that pull request!

## Code Style

### JavaScript
- Use ES6+ features where appropriate
- Follow consistent indentation (2 spaces)
- Use meaningful variable and function names
- Add comments for complex logic

### CSS
- Use CSS custom properties for theming
- Follow BEM methodology when appropriate
- Keep selectors specific but not overly nested
- Use mobile-first responsive design

### HTML
- Use semantic HTML5 elements
- Ensure accessibility standards (WCAG 2.1)
- Include proper meta tags and structured data

## Testing

### Manual Testing Checklist
- [ ] Test on Chrome, Firefox, Safari
- [ ] Test on mobile devices (iOS/Android)
- [ ] Test with slow network connections
- [ ] Test accessibility with screen readers
- [ ] Verify all download flows work correctly

### Cross-Platform Testing
- [ ] YouTube video downloads
- [ ] Instagram post/reel downloads
- [ ] Facebook video downloads
- [ ] TikTok video downloads
- [ ] X/Twitter video downloads

## Bug Reports

We use GitHub issues to track public bugs. Report a bug by opening a new issue.

**Great Bug Reports** tend to have:

- A quick summary and/or background
- Steps to reproduce
  - Be specific!
  - Give sample code if you can
- What you expected would happen
- What actually happens
- Notes (possibly including why you think this might be happening, or stuff you tried that didn't work)

## Feature Requests

We actively welcome feature requests. Please provide:

- **Use case**: Why do you need this feature?
- **Proposed solution**: How should it work?
- **Alternatives**: What other solutions did you consider?
- **Impact**: How many users would benefit?

## Pull Request Guidelines

### Before Submitting
- [ ] Code follows the style guidelines
- [ ] Self-review of your own code
- [ ] Commented hard-to-understand areas
- [ ] Updated documentation if needed
- [ ] No console errors in browser
- [ ] Tested on multiple browsers/devices

### PR Description Template
```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix (non-breaking change which fixes an issue)
- [ ] New feature (non-breaking change which adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] Documentation update

## Testing
- [ ] Manual testing completed
- [ ] Cross-browser testing completed
- [ ] Mobile testing completed

## Screenshots (if applicable)
Add screenshots to help explain your changes

## Additional Notes
Any additional information or context
```

## Coding Standards

### File Organization
```
├── index.html          # Main entry point
├── app.js             # Core application logic
├── style.css          # Main stylesheet
├── components/        # Reusable components (if added)
├── utils/            # Utility functions (if added)
└── assets/           # Images, fonts, etc.
```

### CSS Architecture
- Use CSS custom properties for theming
- Follow mobile-first approach
- Use meaningful class names
- Avoid !important unless absolutely necessary

### JavaScript Best Practices
- Use const/let instead of var
- Prefer arrow functions for callbacks
- Use template literals for string interpolation
- Handle errors gracefully with try/catch
- Use async/await for promises

## Performance Guidelines

### Optimize for Core Web Vitals
- **LCP (Largest Contentful Paint)**: < 2.5s
- **FID (First Input Delay)**: < 100ms
- **CLS (Cumulative Layout Shift)**: < 0.1

### Best Practices
- Minimize HTTP requests
- Optimize images (WebP, proper sizing)
- Use efficient selectors
- Avoid layout thrashing
- Implement proper caching headers

## Accessibility Guidelines

### WCAG 2.1 Compliance
- Provide alt text for images
- Ensure sufficient color contrast (4.5:1 minimum)
- Support keyboard navigation
- Use proper ARIA labels
- Provide focus indicators

### Testing Tools
- axe-core browser extension
- Lighthouse accessibility audit
- Screen reader testing (NVDA/VoiceOver)
- Keyboard-only navigation testing

## Release Process

### Version Numbering
We follow [Semantic Versioning](https://semver.org/):
- **MAJOR**: Breaking changes
- **MINOR**: New features (backward compatible)
- **PATCH**: Bug fixes (backward compatible)

### Release Checklist
- [ ] All tests pass
- [ ] Documentation updated
- [ ] Changelog updated
- [ ] Version number bumped
- [ ] Git tag created
- [ ] Deployment verified

## Questions?

Feel free to reach out:
- Create an issue for bugs or feature requests
- Start a discussion for general questions
- Contact maintainers for urgent issues

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

Thank you for contributing to VideoSaver! 🎉