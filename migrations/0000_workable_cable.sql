CREATE TABLE `audit_logs` (
	`id` varchar(36) NOT NULL DEFAULT (UUID()),
	`document_id` varchar(36) NOT NULL,
	`user_id` varchar(36),
	`action` text NOT NULL,
	`details` json,
	`created_at` text NOT NULL,
	CONSTRAINT `audit_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `categories` (
	`id` varchar(36) NOT NULL DEFAULT (UUID()),
	`name` text NOT NULL,
	`description` text NOT NULL,
	`stages` json NOT NULL,
	`created_by` varchar(36),
	`office_id` varchar(36),
	CONSTRAINT `categories_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `documents` (
	`id` varchar(36) NOT NULL DEFAULT (UUID()),
	`tracking_no` varchar(255) NOT NULL,
	`title` text NOT NULL,
	`subject` text NOT NULL,
	`category_id` varchar(36) NOT NULL,
	`target_date` text NOT NULL,
	`created_at` text NOT NULL,
	`current_stage_started_at` text,
	`delay_notification_count` int DEFAULT 0,
	`created_by` varchar(36) NOT NULL,
	`current_stage_index` int NOT NULL DEFAULT 0,
	`history` json NOT NULL,
	`status` varchar(50) NOT NULL DEFAULT 'active',
	`office_id` varchar(36),
	`is_accepted` int NOT NULL DEFAULT 1,
	`attachment_url` text,
	CONSTRAINT `documents_id` PRIMARY KEY(`id`),
	CONSTRAINT `documents_tracking_no_unique` UNIQUE(`tracking_no`)
);
--> statement-breakpoint
CREATE TABLE `notifications` (
	`id` varchar(36) NOT NULL DEFAULT (UUID()),
	`user_id` varchar(36) NOT NULL,
	`document_id` varchar(36) NOT NULL,
	`message` text NOT NULL,
	`is_read` int NOT NULL DEFAULT 0,
	`created_at` text NOT NULL,
	CONSTRAINT `notifications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `org_nodes` (
	`id` varchar(36) NOT NULL DEFAULT (UUID()),
	`name` text NOT NULL,
	`parent_id` varchar(36),
	`user_id` varchar(36),
	CONSTRAINT `org_nodes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` varchar(36) NOT NULL DEFAULT (UUID()),
	`username` varchar(255) NOT NULL,
	`password` text NOT NULL,
	`full_name` text NOT NULL,
	`role` varchar(50) NOT NULL,
	`position` text,
	`office_id` varchar(36),
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_username_unique` UNIQUE(`username`)
);
