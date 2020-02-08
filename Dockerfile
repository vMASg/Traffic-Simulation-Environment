FROM node:lts-buster AS app-deps
COPY ./client /client
WORKDIR /client
RUN set -eux; \
    npm install -g bower; \
    bower install --allow-root


FROM python:2
ARG USER_NAME="trafficsimenv"
ARG CODE_BASE="/opt/${USER_NAME}/"
ENV CONFIG_FILE="/etc/${USER_NAME}/server-config.json"
# explicitly set user/group IDs
RUN set -eux; \
    useradd -r --user-group --create-home --home-dir ${CODE_BASE} --shell=/bin/bash ${USER_NAME}

WORKDIR ${CODE_BASE}
COPY --chown=${USER_NAME} . .
COPY --chown=${USER_NAME} --from=app-deps /client/app/js/vendor ./client/app/js/vendor/

RUN set -eux; \
    pip install -r server/requirements.txt; \
    chmod 755 server.py

EXPOSE 8000
USER ${USER_NAME}

RUN set -eux; \
    mkdir data

CMD [ "./server.py" ]