provider "aws" {
  region = "ap-southeast-1"
}

resource "aws_instance" "k3s" {
  ami           = "ami-09899993ae9d4459d" # Amazon Linux 2, thay bằng AMI phù hợp region
  instance_type = "t2.micro"
  key_name      = "my-ec2-key"
  vpc_security_group_ids = ["sg-04ee107a5dfd36cbb"]

  tags = {
    Name = "k3s-server"
  }

  provisioner "remote-exec" {
    inline = [
      "curl -sfL https://get.k3s.io | INSTALL_K3S_SKIP_SELINUX_RPM=true sh -"
    ]

    connection {
      type        = "ssh"
      user        = "ec2-user"
      private_key = file("my-ec2-key.pem")
      host        = self.public_ip
    }
  }
}
