FROM node:8
ADD . /code
WORKDIR /code
RUN npm install npm@6.1.0 \
&& cd app \
&& npm install \
&& cd ../server \
&& npm install
