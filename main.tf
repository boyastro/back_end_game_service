provider "aws" {
  region = "ap-southeast-1"
}



resource "aws_instance" "k3s_new" {
  ami           = "ami-004a7732acfcc1e2d" # Amazon Linux 2, instance mới
  instance_type = "t2.micro"
  key_name      = "my-ec2-key"
  vpc_security_group_ids = ["sg-04ee107a5dfd36cbb"]

  tags = {
    Name = "k3s-server"
  }

  provisioner "file" {
    source      = "k3s/"
    destination = "/home/ec2-user/k8s/"
    connection {
      type        = "ssh"
      user        = "ec2-user"
      private_key = file("my-ec2-key.pem")
      host        = self.public_ip
    }
  }

  provisioner "remote-exec" {
    inline = [
      # Cài đặt k3s
      "curl -sfL https://get.k3s.io | INSTALL_K3S_SKIP_SELINUX_RPM=true sh -",
      # Tạo swap file 1GB nếu chưa có
      "if ! sudo swapon --show | grep -q '/swapfile'; then sudo fallocate -l 1G /swapfile && sudo chmod 600 /swapfile && sudo mkswap /swapfile && sudo swapon /swapfile && echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab; fi",
      "sleep 30",
      # Apply manifest k8s
      "sudo /usr/local/bin/k3s kubectl apply -f /home/ec2-user/k8s/"
    ]
    connection {
      type        = "ssh"
      user        = "ec2-user"
      private_key = file("my-ec2-key.pem")
      host        = self.public_ip
    }
  }
}
