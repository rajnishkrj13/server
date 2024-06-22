-- CREATE DATABASE jsodms;

-- USE jsodms;

-- CREATE TABLE users (
--   id INT AUTO_INCREMENT PRIMARY KEY,
--   name VARCHAR(255) NOT NULL,
--   email VARCHAR(255) NOT NULL,
--   password VARCHAR(255) NOT NULL,
--   phone VARCHAR(20)
-- );



-- CREATE TABLE responses (
--   id INT AUTO_INCREMENT PRIMARY KEY,
--   user_id INT NOT NULL,
--   response TEXT,
--   date DATETIME DEFAULT CURRENT_TIMESTAMP,
--   file VARCHAR(255),
--   fileName VARCHAR(255),
--   rowId INT,
--   FOREIGN KEY (user_id) REFERENCES users(id)
-- );




-- CREATE DATABASE jsodms;

-- USE jsodms;

-- CREATE TABLE users (
--   id INT AUTO_INCREMENT PRIMARY KEY,
--   name VARCHAR(255) NOT NULL,
--   email VARCHAR(255) NOT NULL UNIQUE,
--   password VARCHAR(255) NOT NULL,
--   phone VARCHAR(20)
-- );

-- CREATE TABLE responses (
--   id INT AUTO_INCREMENT PRIMARY KEY,
--   user_id INT NOT NULL,
--   response TEXT,
--   date DATETIME DEFAULT CURRENT_TIMESTAMP,
--   file VARCHAR(255),
--   fileName VARCHAR(255),
--   rowId INT,
--   FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE
--   ALTER TABLE responses ADD COLUMN is_deleted BOOLEAN DEFAULT FALSE;

-- );

-- CREATE INDEX idx_user_id ON responses(user_id);




-- Create the database
CREATE DATABASE jsodms;

-- Use the newly created database
USE jsodms;

-- Create the users table
CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  phone VARCHAR(20)
);

-- Create the responses table
CREATE TABLE responses (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  response TEXT,
  date DATETIME DEFAULT CURRENT_TIMESTAMP,
  file VARCHAR(255),
  fileName VARCHAR(255),
  rowId INT,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE
);

-- Add the is_deleted column to the responses table
ALTER TABLE responses ADD COLUMN is_deleted BOOLEAN DEFAULT FALSE;

-- Create an index on user_id in the responses table
CREATE INDEX idx_user_id ON responses(user_id);
