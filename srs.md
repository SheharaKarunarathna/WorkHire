# Software Requirements Specification (SRS) for WorkHire

## 1. Introduction

### 1.1 Purpose

The purpose of this document is to define the functional and non-functional requirements for WorkHire, a platform designed to connect users with nearby service providers (mechanics, electricians, etc.) in real time. This SRS serves as a blueprint for development and ensures all stakeholders have a clear understanding of the system's functionality, constraints, and objectives.

### 1.2 Scope

WorkHire is a full-stack web application aimed at providing an efficient and reliable platform for on-demand services. Users can create service requests, track their status, and rate workers, while workers can manage requests, update statuses, and receive job notifications. The system supports two request flows: open marketplace requests (where workers can bid) and direct requests to a specific worker (who can accept or reject). The system also supports real-time updates, location-based matching, and scalable deployment. Future enhancements may include AI-based recommendations and live tracking.

In this context, the existing request/bid model is treated as an open service ad flow. In addition, the system shall provide a direct hire flow where a user can send a detailed request to one selected worker without publishing it to the open marketplace.

### 1.3 Definitions, Acronyms, and Abbreviations

* **User**: A person requesting a service.
* **Worker**: A service provider who fulfills requests.
* **Request**: A job created by a user.
* **MVP**: Minimum Viable Product.
* **JWT**: JSON Web Token, used for authentication.
* **API**: Application Programming Interface.

### 1.4 References

* React documentation: [https://reactjs.org/docs/getting-started.html](https://reactjs.org/docs/getting-started.html)
* Node.js documentation: [https://nodejs.org/en/docs/](https://nodejs.org/en/docs/)
* Express documentation: [https://expressjs.com/](https://expressjs.com/)
* PostgreSQL documentation: [postgresqlW3schools](https://www.w3schools.com/postgresql/)

### 1.5 Overview

This SRS provides detailed descriptions of functional requirements, system architecture, database design, and non-functional requirements. It will guide the development team in creating a robust, maintainable, and scalable application.

---

## 2. Overall Description

### 2.1 Product Perspective

WorkHire is a web-based platform integrating the following components:

* **Frontend**: React-based, responsive UI
* **Backend**: Node.js with Express framework
* **Database**: PostgreSQL 
* **Real-time Communication**: Socket.io or WebSocket for updates

### 2.2 Product Functions

* User registration and authentication
* Worker registration and profile management
* Open service ad creation with bidding and bid selection
* Direct service request to a selected worker with accept/reject flow
* Service request tracking
* Open request bidding and bid acceptance workflow
* Location-based worker-user matching
* Real-time status updates
* Ratings and reviews

### 2.3 User Classes and Characteristics

* **End Users**: Require simple, intuitive UI for service requests.
* **Workers**: Need efficient request management, availability settings, and notifications.
* **Admin (Optional)**: Monitors system performance, manages users/workers, and reviews analytics.

### 2.4 Operating Environment

* Modern web browsers (Chrome, Firefox, Edge, Safari)
* Mobile responsive design
* Backend hosted on cloud platforms (Heroku, Render, or AWS)

### 2.5 Design and Implementation Constraints

* System must support concurrent users
* RESTful APIs for backend communication
* JWT for secure authentication
* Dockerized deployment for consistency across environments

### 2.6 Assumptions and Dependencies

* Users and workers have internet-enabled devices
* Location services are accessible and permitted by users
* postgresql is used as the primary database

---

## 3. Functional Requirements

### 3.1 Authentication and Authorization

* User and worker registration and login
* JWT-based secure authentication
* Password hashing and secure storage
* Worker identity must be verified before placing, updating, or withdrawing bids
* Role-based access control to ensure only workers can bid and only users can accept bids

### 3.2 User Features

* Create open marketplace service ads with description, category, and location
* Create direct service requests to a specific worker with required service details
* Book worker appointments by selecting an available date and time interval
* View real-time request status
* Rate and review workers
* Receive notifications about request updates
* Send optional budget, urgency, and preferred schedule details in direct requests

### 3.3 Worker Features

* Register as worker and set skill categories
* Update availability status
* Set and manage available booking time intervals
* Accept or reject direct service requests targeted to them
* Update job progress and completion status
* Bid for open marketplace requests

### 3.4 Matching System

* Match service requests to nearest available workers based on location
* Implement prioritization by rating, distance, and worker availability
* Exclude direct requests from marketplace auto-matching and open bidding

### 3.5 Real-Time Communication

* Notify users when a worker accepts a request
* Notify workers when they receive direct requests and notify users when direct requests are accepted or rejected
* Update request progress in real time
* Optional chat system between user and worker

### 3.7 Request and Bid Flow Rules

* System shall support `open` requests and `direct` requests
* `open` requests represent public service ads visible to eligible workers
* Open requests shall allow multiple worker bids
* Direct requests shall target one worker and shall not allow bidding by other workers
* Only the targeted worker can accept or reject a direct request
* Once a direct request is accepted, it shall move to assigned/in-progress flow
* A request can have only one accepted worker assignment

### 3.8 Direct Request Workflow

* User shall be able to select a specific worker profile and create a direct request
* Direct request form shall include: service description, location, optional budget, urgency, and preferred appointment window
* System shall notify only the targeted worker for a direct request
* Targeted worker shall be able to `accept` or `reject` the direct request
* On `accept`, request status shall become `accepted` and worker shall be assigned
* On `reject`, request status shall become `rejected` and user shall be notified
* User may then choose to send another direct request or convert the request to an open marketplace ad

### 3.9 Administrative Features (Optional)

* Dashboard for monitoring system usage
* Manage user and worker accounts
* Review service requests and ratings

---

## 4. Non-Functional Requirements

### 4.1 Performance

* Backend API response time should not exceed 2 seconds
* Real-time updates must be delivered within 1 second

### 4.2 Scalability

* System should handle hundreds of concurrent requests
* Database and backend designed to scale horizontally

### 4.3 Security

* Encrypted storage for sensitive data
* Input validation to prevent injection attacks
* Secure API endpoints with authentication

### 4.4 Usability

* Intuitive and responsive interface
* Error messages and notifications for guidance
* Mobile-friendly layout

### 4.5 Reliability

* System uptime ≥ 99%
* Graceful error handling
* Logging and monitoring of backend services

---

## 5. Database Requirements

### 5.1 User Collection

* `id` (primary key)
* `name`
* `email` (unique)
* `password` (hashed)
* `location` (optional)

### 5.2 Worker Collection

* `id` (primary key)
* `name`
* `email` (unique)
* `password` (hashed)
* `skills` (array of categories)
* `location` (coordinates)
* `availability` (boolean)
* `rating` (average)

### 5.3 Bid Collection

* `id` (primary key)
* `requestId` (foreign key)
* `workerId` (foreign key)
* `amount`
* `message` (optional)
* `status` (active, withdrawn, accepted, rejected)
* `createdAt` / `updatedAt`
* Constraint: bids are allowed only for requests with `requestType = open`

### 5.4 Request Collection

* `id` (primary key)
* `userId` (foreign key)
* `workerId` (foreign key, nullable for open requests; required for direct requests)
* `requestType` (open, direct)
* `status` (pending, accepted, rejected, in-progress, completed)
* `description`
* `location` (coordinates)
* `budget` (optional)
* `urgency` (optional: low, medium, high)
* `appointmentDate` (optional)
* `bookingStartTime` (optional)
* `bookingEndTime` (optional)
* `timeZone` (optional)
* `createdAt` / `updatedAt`
* `directResponseAt` (timestamp, optional)
* Constraint: if `requestType = direct`, `workerId` must be present
* Constraint: if `requestType = direct`, bid records must not be created for the request

---

## 6. Future Enhancements

* AI-powered worker recommendation system
* Live map tracking of workers
* Payment integration and invoicing
* Multi-language support

---

## 7. Conclusion

WorkHire aims to provide an efficient, reliable, and user-friendly platform connecting users with nearby workers. By incorporating real-time updates, location-based matching, and optional AI features.