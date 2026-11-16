# Flogic as a web page,  in a small web server  (nginx,  not running as root,  port 8080).
#
#   docker build -t flogic .                              the staff app only
#   docker build -t flogic --build-arg IT_CONSOLE=1 .     ...and IT's console at /it-console/it-console.html
#   docker run --rm -p 8080:8080 flogic                   then open  http://localhost:8080
#
# ONLY THE APP'S OWN FILES GO IN:  .html  .js  .css  and pictures.   No data,  no keys,  no keyrings,  no tests.
# The first stage refuses to build if anything else is in the two page folders.

# ---- 1.  gather the pages,  and check them ----
FROM alpine:3.20 AS site
ARG IT_CONSOLE=0
WORKDIR /site
COPY DataPage/ ./DataPage/
COPY it-console/ /maybe/it-console/
RUN set -eu; \
    if [ "$IT_CONSOLE" = "1" ]; then mv /maybe/it-console ./it-console; fi; \
    extra="$(find . -type f ! -name '*.html' ! -name '*.js' ! -name '*.css' ! -name '*.ico' ! -name '*.png' ! -name '*.svg')"; \
    if [ -n "$extra" ]; then echo "These are not app files, so the image is not built:"; echo "$extra"; exit 1; fi; \
    test -f DataPage/flogic.html

# ---- 2.  the server ----
FROM nginxinc/nginx-unprivileged:1.27-alpine
USER root
RUN rm -f /usr/share/nginx/html/index.html /usr/share/nginx/html/50x.html
COPY deploy/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=site /site/ /usr/share/nginx/html/
USER 101
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s --retries=3 CMD wget -q -O /dev/null http://127.0.0.1:8080/healthz || exit 1
