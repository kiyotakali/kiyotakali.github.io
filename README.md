# Ken Li — Personal Homepage

Source for [kiyotakali.github.io](https://kiyotakali.github.io/).

## Local preview

```bash
python3 -m http.server 4000
```

Then open <http://127.0.0.1:4000/>.

## Content structure

- `index.html`: biography, publications, experience, project, education, and service
- `images/`: profile and page-specific media
- `assets/css/main.css`: exact compiled stylesheet from the referenced Jiazhe Wei template
- `assets/css/latest-components.css`: latest publication-link and three-project-card components synced from the reference template
- `assets/js/main.min.js`: original AcadHomepage runtime
- `assets/js/custom-scripts.js`: original navigation, background, sidebar, news, and publication interactions
- `assets/js/github-stars.js`: live GitHub star-count enhancement for PosterCopilot and Miru

## Theme attribution

This static adaptation directly reuses the compiled layout and styling of the MIT-licensed [JiazheWei.github.io](https://github.com/JiazheWei/JiazheWei.github.io) template, which is based on [AcadHomepage](https://github.com/RayeRen/acad-homepage.github.io). Personal content and assets are maintained in this repository. See [LICENSE](LICENSE).
