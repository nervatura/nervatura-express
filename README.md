Nervatura Node Demo App
=========================

Open Source Business Management Framework

Please see more the [Nervatura Docs](https://nervatura.github.io/nervatura/)
 
The purpose of this example application is to demonstrate the use of server-side CLI and gRPC functions. 

## Installation

    $ git clone https://github.com/nervatura/nervatura-express.git nervatura
    $ cd nervatura
    $ npm install

This demo application works on Linux x64 and Windows x64 systems!

## Configuration Options

The application uses environment variables to set configuration options (app_dir/.env). It will be read from the [.env.example](https://github.com/nervatura/nervatura-service/blob/master/.env.example) file. Set the environment variables as needed!
## Quick Start

1. Create a new demo database.

```
  node_modules/nervatura/bin/nervatura \
    -c DatabaseCreate -k DEMO_API_KEY \
    -o "{\"database\":\"demo\",\"demo\":true}"
```

2. Start the Node and Nervatura backend server

```
  $ NODE_ENV=development node server.js
```

3. CLI (command line) interface: [http://localhost:8080/](http://localhost:8080/)

Username: **admin**<br />
Password: **Empty password**<br />
Database: **demo**<br />
Server URL: **http://localhost:8080/cli**

3. gRPC interface: [http://localhost:8080/](http://localhost:8080/)

Username: **admin**<br />
Password: **Empty password**<br />
Database: **demo**<br />
Server URL: **http://localhost:8080/rpc**
